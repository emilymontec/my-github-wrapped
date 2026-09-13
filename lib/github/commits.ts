import type { Octokit } from "@octokit/rest";
import { withRetry } from "@/lib/github/client";

export interface CollectedCommit {
  sha: string;
  message: string;
  date: string; // ISO, UTC — la normalización de timezone ocurre en Analytics Engine
  author: string;
  authorEmail: string | null;
  isOwnedByUser: boolean;
}

/**
 * Trae commits de un repo, paginando. `since` habilita incremental sync
 * (sección 12): solo se piden commits posteriores a la última sincronización.
 *
 * ⚠️ Resolución de identidad (sección 11): un commit puede no estar
 * vinculado automáticamente a la cuenta de GitHub del usuario si el email
 * del commit local no coincide con ninguno registrado en la cuenta. Por
 * eso comparamos también contra `verifiedEmails`, no solo contra
 * `commit.author.login`.
 *
 * ⚠️ CORRECCIÓN (auditoría Fase 13, Hallazgo 1): `repos` se sincroniza con
 * `affiliation: "owner,collaborator,organization_member"` (ver
 * lib/jobs/sync.ts) — es decir, esta función también corre sobre repos
 * donde el usuario NO es el único autor. `commit.author?.login` es el
 * login al que GITHUB vinculó ese commit, que puede ser el de CUALQUIER
 * colaborador, no necesariamente el del usuario que está siendo
 * analizado. Verificar solo que exista (`Boolean(commit.author?.login)`)
 * atribuía commits ajenos al usuario en cualquier repo compartido/org.
 * La comparación correcta es contra el login real del usuario
 * autenticado (`currentUserLogin`), case-insensitive porque GitHub no
 * distingue mayúsculas en logins.
 */
export async function getCommitsForRepository(
  client: Octokit,
  params: {
    owner: string;
    repo: string;
    since?: Date;
    verifiedEmails: string[];
    currentUserLogin: string;
  }
): Promise<CollectedCommit[]> {
  const { owner, repo, since, verifiedEmails, currentUserLogin } = params;
  const emailSet = new Set(verifiedEmails.map((e) => e.toLowerCase()));
  const normalizedLogin = currentUserLogin.toLowerCase();
  const commits: CollectedCommit[] = [];
  let page = 1;
  const perPage = 100;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await withRetry(() =>
      client.rest.repos.listCommits({
        owner,
        repo,
        per_page: perPage,
        page,
        since: since?.toISOString()
      })
    );

    for (const commit of data) {
      const commitAuthorEmail = commit.commit.author?.email ?? null;
      const isOwnedByUser =
        commit.author?.login?.toLowerCase() === normalizedLogin || // GitHub lo vinculó A ESTE usuario
        (commitAuthorEmail !== null && emailSet.has(commitAuthorEmail.toLowerCase()));

      commits.push({
        sha: commit.sha,
        message: commit.commit.message,
        date: commit.commit.author?.date ?? commit.commit.committer?.date ?? new Date().toISOString(),
        author: commit.commit.author?.name ?? "unknown",
        authorEmail: commitAuthorEmail,
        isOwnedByUser
      });
    }

    if (data.length < perPage) break;
    page += 1;
  }

  return commits.filter((c) => c.isOwnedByUser);
}
