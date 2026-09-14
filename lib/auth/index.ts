import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import { encryptToken } from "@/lib/auth/crypto";

// ⚠️ Scopes mínimos necesarios para el MVP (sección 10 y 5): solo lectura de
// perfil y repos PÚBLICOS. `repo` (acceso a privados) es un upgrade
// explícito posterior — ver GITHUB_SCOPES_WITH_PRIVATE_REPOS (Fase 6),
// nunca se pide en el login inicial.
export const GITHUB_SCOPES = "read:user user:email public_repo";

// Fase 6 (repos privados, opt-in): scope ampliado que se solicita SOLO
// cuando el usuario elige explícitamente conectar repos privados desde
// /settings — nunca en el login inicial, nunca por defecto.
export const GITHUB_SCOPES_WITH_PRIVATE_REPOS = "read:user user:email public_repo repo";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
        ? {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET
          }
        : {}),
      // ⚠️ GitHub activó RFC 9207 (OAuth 2.0 Authorization Server Issuer
      // Identification) y ahora manda `iss=https://github.com/login/oauth`
      // en el callback. next-auth@5.0.0-beta.22 no trae el issuer de
      // GitHub por defecto, así que Auth.js lo compara contra su
      // placeholder interno y falla con "unexpected iss (issuer) response
      // parameter value". Fijarlo explícito evita depender de actualizar
      // next-auth. Ver https://github.com/nextauthjs/next-auth/releases (4.24.14 lo trae por defecto en v4; en v5 hay que declararlo a mano).
      issuer: "https://github.com/login/oauth",
      authorization: { params: { scope: GITHUB_SCOPES } }
    })
  ],
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    }
  },
  events: {
    /**
     * ⚠️ A propósito NO se usa `events.linkAccount` para persistir el
     * token: ese evento solo se dispara la PRIMERA vez que se vincula la
     * cuenta de GitHub. El flujo de autorización incremental de la Fase
     * 6 (pedir el scope `repo` más adelante, para un usuario que ya
     * tiene la cuenta vinculada) pasa de nuevo por sign-in, no por
     * link-account — así que la única forma de capturar el token/scope
     * ACTUALIZADO en una reautorización es escuchar `signIn`, que se
     * dispara en cada inicio de sesión, sea el primero o el número 50.
     */
    async signIn({ user, account, profile }) {
      if (!user.id || account?.provider !== "github") return;

      // githubId/username/avatar: el adapter de Prisma solo persiste los
      // campos "estándar" (name/email/image) — estos son propios de
      // nuestro dominio y se completan a partir del profile de GitHub
      // (ver https://docs.github.com/rest/users/users#get-a-user).
      if (profile) {
        const githubProfile = profile as unknown as {
          id: number;
          login: string;
          avatar_url: string;
        };

        await prisma.user.update({
          where: { id: user.id },
          data: {
            githubId: String(githubProfile.id),
            username: githubProfile.login,
            avatar: githubProfile.avatar_url
          }
        });
      }

      // Espejamos el access/refresh token — CIFRADOS — en nuestro propio
      // modelo GitHubAccount (sección 9), que es el que usa el
      // GitHubCollector. Corre en CADA sign-in para que una
      // reautorización con scope ampliado (Fase 6) actualice el token
      // guardado, no solo la primera vez.
      await prisma.gitHubAccount.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          accessToken: encryptToken(String(account.access_token)),
          refreshToken: account.refresh_token
            ? encryptToken(String(account.refresh_token))
            : null,
          scope: account.scope ?? GITHUB_SCOPES,
          tokenType: account.token_type ?? "bearer",
          expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null
        },
        update: {
          accessToken: encryptToken(String(account.access_token)),
          refreshToken: account.refresh_token
            ? encryptToken(String(account.refresh_token))
            : undefined,
          scope: account.scope ?? GITHUB_SCOPES,
          expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null
        }
      });

      // Inicializa el registro de sincronización (sección 12) en IDLE.
      // Idempotente — correr esto en cada sign-in (no solo el primero)
      // es inofensivo.
      await prisma.syncState.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {}
      });
    }
  },
  pages: {
    signIn: "/"
  }
});
