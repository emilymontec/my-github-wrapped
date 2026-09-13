import { PrismaClient } from "@prisma/client";

/**
 * ⚠️ Este seed usa SU PROPIO `PrismaClient`, independiente de
 * `lib/db/prisma.ts` -- corre en Node fuera del proceso de Next.js
 * (desde `e2e/global-setup.ts`, antes de que arranque cualquier
 * navegador), contra `DATABASE_URL` (idealmente una DB de test/staging
 * dedicada, NUNCA production — ver README.md, Fase 12).
 *
 * Datos deliberadamente pequeños pero con forma real: alcanza para que
 * cada spec tenga algo determinístico contra qué hacer asserts (un
 * commit conocido, un lenguaje conocido, una racha conocida) sin
 * depender de sincronizar contra la API real de GitHub en cada corrida.
 */

export const TEST_USER_ID = "e2e-test-user-id";
export const TEST_SESSION_TOKEN = "e2e-test-session-token-do-not-use-in-prod";
export const TEST_USERNAME = "e2e-test-user";

const YEAR = new Date().getUTCFullYear();
const PREVIOUS_YEAR = YEAR - 1;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

export async function seedTestUser(prisma: PrismaClient): Promise<void> {
  await cleanupTestUser(prisma); // idempotente: nunca falla si ya se había corrido antes

  await prisma.user.create({
    data: {
      id: TEST_USER_ID,
      name: "E2E Test User",
      email: "e2e-test@example.com",
      username: TEST_USERNAME,
      githubId: "999999999",
      avatar: "https://avatars.githubusercontent.com/u/0",
      timezone: "America/Argentina/Buenos_Aires",
      locale: "es",
      sessions: {
        create: {
          sessionToken: TEST_SESSION_TOKEN,
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24h -- de sobra para una corrida de CI
        }
      },
      // ⚠️ Token dummy, NO desencriptable de verdad -- ningún spec de
      // esta suite dispara una sincronización real contra la API de
      // GitHub (ver README.md, límite conocido de Fase 12). Si algún
      // spec futuro necesita eso, va a necesitar un token real inyectado
      // por variable de entorno de CI, nunca hardcodeado acá.
      githubAccount: {
        create: {
          accessToken: "e2e-dummy-encrypted-token",
          scope: "read:user user:email public_repo",
          tokenType: "bearer"
        }
      },
      notificationPreference: {
        create: { wrappedReadyEmail: true, streakMilestoneEmail: true }
      },
      repositories: {
        create: [
          {
            id: "e2e-repo-1",
            githubId: "1",
            name: "github-wrapped",
            fullName: `${TEST_USERNAME}/github-wrapped`,
            url: `https://github.com/${TEST_USERNAME}/github-wrapped`,
            private: false
          },
          {
            id: "e2e-repo-2",
            githubId: "2",
            name: "dotfiles",
            fullName: `${TEST_USERNAME}/dotfiles`,
            url: `https://github.com/${TEST_USERNAME}/dotfiles`,
            private: false
          }
        ]
      }
    }
  });

  // Commits de los últimos 10 días -- suficiente para que el dashboard
  // (período "Últimos 30 días") muestre actividad real sin necesitar un
  // año entero de fixtures.
  await prisma.commit.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      id: `e2e-commit-${i}`,
      sha: `e2e-sha-${i}`,
      message: `test: commit de prueba #${i}`,
      date: daysAgo(i),
      author: TEST_USERNAME,
      authorEmail: "e2e-test@example.com",
      repositoryId: "e2e-repo-1",
      userId: TEST_USER_ID
    }))
  });

  await prisma.languageStat.createMany({
    data: [
      {
        id: "e2e-lang-1",
        language: "TypeScript",
        bytes: 50_000,
        percentage: 80,
        capturedAt: new Date(),
        repositoryId: "e2e-repo-1",
        userId: TEST_USER_ID
      },
      {
        id: "e2e-lang-2",
        language: "CSS",
        bytes: 12_500,
        percentage: 20,
        capturedAt: new Date(),
        repositoryId: "e2e-repo-1",
        userId: TEST_USER_ID
      }
    ]
  });

  // Un WrappedReport de un año YA CERRADO, pre-generado -- así los specs
  // de /wrapped/[year] pueden probar la vista de slides sin depender de
  // que el job de Inngest (IA + Analytics Engine) corra durante el test.
  await prisma.wrappedReport.create({
    data: {
      id: "e2e-wrapped-previous-year",
      userId: TEST_USER_ID,
      periodStart: new Date(Date.UTC(PREVIOUS_YEAR, 0, 1)),
      periodEnd: new Date(Date.UTC(YEAR, 0, 1)),
      totalCommits: 250,
      totalRepositories: 2,
      topLanguage: "TypeScript",
      topRepository: `${TEST_USERNAME}/github-wrapped`,
      longestStreak: 12,
      isPublic: false,
      slidesOrder: ["opening", "volume", "rhythm", "languages", "repos", "streak", "closing"],
      generatedAt: new Date()
    }
  });

  await prisma.badge.createMany({
    data: [
      { id: "e2e-badge-1", userId: TEST_USER_ID, type: "streak_7", metadata: { streakLength: 7 } }
    ]
  });
}

export async function cleanupTestUser(prisma: PrismaClient): Promise<void> {
  // El borrado del User cascadea todo lo demás (Session, GitHubAccount,
  // Repository, Commit, LanguageStat, WrappedReport, Badge,
  // NotificationPreference — ver onDelete: Cascade en cada relación,
  // mismo mecanismo que lib/account/delete.ts). `deleteMany` en vez de
  // `delete` porque debe ser un no-op silencioso si el usuario de test
  // no existe todavía (primera corrida).
  await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
}
