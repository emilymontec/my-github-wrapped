import { describe, expect, it, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { Octokit } from "@octokit/rest";
import { getCommitsForRepository } from "@/lib/github/commits";

/**
 * ⚠️ Cubre la corrección del Hallazgo 1 de la auditoría (Fase 13):
 * `commit.author?.login` es el login al que GITHUB vinculó ese commit —
 * el de CUALQUIER colaborador del repo, no necesariamente el del usuario
 * analizado. Como `lib/jobs/sync.ts` sincroniza repos con
 * `affiliation: "owner,collaborator,organization_member"` (no solo
 * repos propios), un commit de un compañero de equipo o de organización
 * con su cuenta vinculada NO debe contarse como propio.
 *
 * Sigue la misma convención que client.integration.test.ts: mocking de
 * HTTP real vía msw, nunca contra la API real de GitHub (ver
 * "Convenciones de desarrollo" en ROADMAP.md).
 */

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function client() {
  return new Octokit({ auth: "fake-token-for-tests" });
}

function commitFixture(overrides: {
  sha: string;
  authorLogin: string | null;
  authorEmail: string | null;
}) {
  return {
    sha: overrides.sha,
    commit: {
      message: "commit de prueba",
      author: { name: "alguien", email: overrides.authorEmail, date: "2026-01-15T10:00:00Z" },
      committer: { name: "alguien", email: overrides.authorEmail, date: "2026-01-15T10:00:00Z" }
    },
    author: overrides.authorLogin ? { login: overrides.authorLogin } : null
  };
}

describe("getCommitsForRepository — resolución de identidad", () => {
  it("NO atribuye al usuario un commit de otro colaborador del repo con login vinculado", async () => {
    server.use(
      http.get("https://api.github.com/repos/acme/shared-repo/commits", () => {
        return HttpResponse.json([
          // Commit de un COMPAÑERO de equipo, vinculado a SU propia cuenta.
          commitFixture({ sha: "aaa111", authorLogin: "colega-de-equipo", authorEmail: "colega@example.com" }),
          // Commit del usuario que estamos analizando.
          commitFixture({ sha: "bbb222", authorLogin: "emilydev", authorEmail: "emily@example.com" })
        ]);
      })
    );

    const commits = await getCommitsForRepository(client(), {
      owner: "acme",
      repo: "shared-repo",
      verifiedEmails: ["emily@example.com"],
      currentUserLogin: "emilydev"
    });

    expect(commits.map((c) => c.sha)).toEqual(["bbb222"]);
  });

  it("SÍ atribuye un commit sin login vinculado pero con email verificado del usuario", async () => {
    server.use(
      http.get("https://api.github.com/repos/acme/shared-repo/commits", () => {
        return HttpResponse.json([
          commitFixture({ sha: "ccc333", authorLogin: null, authorEmail: "emily@example.com" })
        ]);
      })
    );

    const commits = await getCommitsForRepository(client(), {
      owner: "acme",
      repo: "shared-repo",
      verifiedEmails: ["emily@example.com"],
      currentUserLogin: "emilydev"
    });

    expect(commits.map((c) => c.sha)).toEqual(["ccc333"]);
  });

  it("la comparación de login es case-insensitive", async () => {
    server.use(
      http.get("https://api.github.com/repos/acme/shared-repo/commits", () => {
        return HttpResponse.json([
          commitFixture({ sha: "ddd444", authorLogin: "EmilyDev", authorEmail: null })
        ]);
      })
    );

    const commits = await getCommitsForRepository(client(), {
      owner: "acme",
      repo: "shared-repo",
      verifiedEmails: [],
      currentUserLogin: "emilydev"
    });

    expect(commits.map((c) => c.sha)).toEqual(["ddd444"]);
  });

  it("no atribuye un commit sin login vinculado y sin email verificado coincidente", async () => {
    server.use(
      http.get("https://api.github.com/repos/acme/shared-repo/commits", () => {
        return HttpResponse.json([
          commitFixture({ sha: "eee555", authorLogin: null, authorEmail: "desconocido@example.com" })
        ]);
      })
    );

    const commits = await getCommitsForRepository(client(), {
      owner: "acme",
      repo: "shared-repo",
      verifiedEmails: ["emily@example.com"],
      currentUserLogin: "emilydev"
    });

    expect(commits).toEqual([]);
  });
});
