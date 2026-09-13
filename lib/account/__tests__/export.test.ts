import { describe, expect, it, vi, beforeEach } from "vitest";

const findUniqueOrThrowMock = vi.fn();
const repositoryFindManyMock = vi.fn();
const commitFindManyMock = vi.fn();
const languageStatFindManyMock = vi.fn();
const wrappedReportFindManyMock = vi.fn();
const insightFindManyMock = vi.fn();
const badgeFindManyMock = vi.fn();
const comparisonLinkFindManyMock = vi.fn();
const notificationPreferenceFindUniqueMock = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUniqueOrThrow: (...args: unknown[]) => findUniqueOrThrowMock(...args) },
    repository: { findMany: (...args: unknown[]) => repositoryFindManyMock(...args) },
    commit: { findMany: (...args: unknown[]) => commitFindManyMock(...args) },
    languageStat: { findMany: (...args: unknown[]) => languageStatFindManyMock(...args) },
    wrappedReport: { findMany: (...args: unknown[]) => wrappedReportFindManyMock(...args) },
    insight: { findMany: (...args: unknown[]) => insightFindManyMock(...args) },
    badge: { findMany: (...args: unknown[]) => badgeFindManyMock(...args) },
    comparisonLink: { findMany: (...args: unknown[]) => comparisonLinkFindManyMock(...args) },
    notificationPreference: {
      findUnique: (...args: unknown[]) => notificationPreferenceFindUniqueMock(...args)
    }
  }
}));

import { buildAccountExport } from "@/lib/account/export";

function baseUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "Emily",
    email: "emily@example.com",
    username: "emilydev",
    timezone: "America/Argentina/Buenos_Aires",
    locale: "es",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    githubAccount: { scope: "read:user user:email public_repo", tokenType: "bearer", expiresAt: null },
    ...overrides
  };
}

describe("buildAccountExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueOrThrowMock.mockResolvedValue(baseUser());
    repositoryFindManyMock.mockResolvedValue([]);
    commitFindManyMock.mockResolvedValue([]);
    languageStatFindManyMock.mockResolvedValue([]);
    wrappedReportFindManyMock.mockResolvedValue([]);
    insightFindManyMock.mockResolvedValue([]);
    badgeFindManyMock.mockResolvedValue([]);
    comparisonLinkFindManyMock.mockResolvedValue([]);
    notificationPreferenceFindUniqueMock.mockResolvedValue(null);
  });

  it("NUNCA incluye accessToken/refreshToken, aunque estuvieran en el select", async () => {
    const result = await buildAccountExport("u1");
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("accessToken");
    expect(serialized).not.toContain("refreshToken");
    expect(result.githubAccount).toEqual({
      scope: "read:user user:email public_repo",
      tokenType: "bearer",
      expiresAt: null
    });
  });

  it("incluye el perfil con todos los campos esperados", async () => {
    const result = await buildAccountExport("u1");

    expect(result.profile).toEqual({
      name: "Emily",
      email: "emily@example.com",
      username: "emilydev",
      timezone: "America/Argentina/Buenos_Aires",
      locale: "es",
      createdAt: "2024-01-01T00:00:00.000Z"
    });
  });

  it("mapea commits con el nombre del repositorio, no su ID interno", async () => {
    commitFindManyMock.mockResolvedValue([
      {
        sha: "abc123",
        message: "fix: bug",
        date: new Date("2026-03-01T12:00:00Z"),
        author: "emilydev",
        authorEmail: "emily@example.com",
        repository: { fullName: "emilydev/github-wrapped" }
      }
    ]);

    const result = await buildAccountExport("u1");

    expect(result.commits).toEqual([
      {
        sha: "abc123",
        message: "fix: bug",
        date: "2026-03-01T12:00:00.000Z",
        author: "emilydev",
        authorEmail: "emily@example.com",
        repository: "emilydev/github-wrapped"
      }
    ]);
  });

  it("en comparaciones, solo expone el username del OTRO participante, nunca sus métricas", async () => {
    comparisonLinkFindManyMock.mockResolvedValue([
      {
        userAId: "u1",
        status: "ACCEPTED",
        createdAt: new Date("2026-02-01T00:00:00Z"),
        userA: { username: "emilydev" },
        userB: { username: "otheruser" }
      }
    ]);

    const result = await buildAccountExport("u1");

    expect(result.comparisons).toEqual([
      { otherUsername: "otheruser", status: "ACCEPTED", direction: "sent", createdAt: "2026-02-01T00:00:00.000Z" }
    ]);
    // Ninguna clave del objeto de comparación filtra métricas del otro usuario.
    expect(Object.keys(result.comparisons[0])).toEqual(["otherUsername", "status", "direction", "createdAt"]);
  });

  it("marca la dirección 'received' cuando el usuario es userB", async () => {
    comparisonLinkFindManyMock.mockResolvedValue([
      {
        userAId: "other-id",
        status: "PENDING",
        createdAt: new Date("2026-02-01T00:00:00Z"),
        userA: { username: "otheruser" },
        userB: { username: "emilydev" }
      }
    ]);

    const result = await buildAccountExport("u1");

    expect(result.comparisons[0].direction).toBe("received");
    expect(result.comparisons[0].otherUsername).toBe("otheruser");
  });

  it("githubAccount es null si el usuario nunca conectó GitHub (caso defensivo)", async () => {
    findUniqueOrThrowMock.mockResolvedValue(baseUser({ githubAccount: null }));

    const result = await buildAccountExport("u1");

    expect(result.githubAccount).toBeNull();
  });

  it("incluye exportedAt como timestamp ISO válido", async () => {
    const result = await buildAccountExport("u1");
    expect(() => new Date(result.exportedAt).toISOString()).not.toThrow();
  });
});
