import { prisma } from "@/lib/db/prisma";

/**
 * ⚠️ Esto es "tus datos de GitHub Wrapped", no un dump crudo de toda
 * fila de la DB que mencione al usuario. Deliberadamente EXCLUIDO:
 * - `GitHubAccount.accessToken`/`refreshToken`: son credenciales vivas
 *   de acceso a GitHub, cifradas en reposo por un motivo (ver
 *   lib/github/crypto.ts) — meterlas en un archivo JSON descargable
 *   sería crear una segunda copia sin cifrar, exactamente lo que la
 *   regla "nunca en texto plano" busca evitar. Se incluye sí metadata
 *   no sensible (scope, tokenType, expiresAt).
 * - `Account`/`Session` de Auth.js: plumbing interno de autenticación,
 *   no contenido que el usuario reconocería como "sus datos".
 * - Datos del OTRO participante en una comparación: solo su username
 *   (lo mínimo para que el export tenga sentido), nunca sus métricas —
 *   esas son SUS datos, no del usuario que pide el export.
 */
export interface AccountExport {
  exportedAt: string;
  profile: {
    name: string | null;
    email: string | null;
    username: string | null;
    timezone: string;
    locale: string;
    createdAt: string;
  };
  githubAccount: { scope: string | null; tokenType: string | null; expiresAt: string | null } | null;
  repositories: {
    name: string;
    fullName: string;
    private: boolean;
    url: string;
    createdAt: string;
  }[];
  commits: {
    sha: string;
    message: string;
    date: string;
    author: string;
    authorEmail: string | null;
    repository: string;
  }[];
  languageStats: { language: string; bytes: number; percentage: number; capturedAt: string; repository: string }[];
  wrappedReports: {
    periodStart: string;
    periodEnd: string;
    totalCommits: number;
    totalRepositories: number;
    topLanguage: string | null;
    topRepository: string | null;
    longestStreak: number;
    isPublic: boolean;
    generatedAt: string;
  }[];
  insights: { type: string; periodStart: string; periodEnd: string; narrative: string; createdAt: string }[];
  badges: { type: string; earnedAt: string; metadata: unknown }[];
  comparisons: { otherUsername: string | null; status: string; direction: "sent" | "received"; createdAt: string }[];
  notificationPreference: { wrappedReadyEmail: boolean; streakMilestoneEmail: boolean } | null;
}

export async function buildAccountExport(userId: string): Promise<AccountExport> {
  const [
    user,
    repositories,
    commits,
    languageStats,
    wrappedReports,
    insights,
    badges,
    comparisons,
    notificationPreference
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        username: true,
        timezone: true,
        locale: true,
        createdAt: true,
        githubAccount: { select: { scope: true, tokenType: true, expiresAt: true } }
      }
    }),
    prisma.repository.findMany({
      where: { userId },
      select: { name: true, fullName: true, private: true, url: true, createdAt: true }
    }),
    prisma.commit.findMany({
      where: { userId },
      select: {
        sha: true,
        message: true,
        date: true,
        author: true,
        authorEmail: true,
        repository: { select: { fullName: true } }
      }
    }),
    prisma.languageStat.findMany({
      where: { userId },
      select: {
        language: true,
        bytes: true,
        percentage: true,
        capturedAt: true,
        repository: { select: { fullName: true } }
      }
    }),
    prisma.wrappedReport.findMany({
      where: { userId },
      select: {
        periodStart: true,
        periodEnd: true,
        totalCommits: true,
        totalRepositories: true,
        topLanguage: true,
        topRepository: true,
        longestStreak: true,
        isPublic: true,
        generatedAt: true
      }
    }),
    prisma.insight.findMany({
      where: { userId },
      select: { type: true, periodStart: true, periodEnd: true, narrative: true, createdAt: true }
    }),
    prisma.badge.findMany({
      where: { userId },
      select: { type: true, earnedAt: true, metadata: true }
    }),
    prisma.comparisonLink.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      select: {
        userAId: true,
        status: true,
        createdAt: true,
        userA: { select: { username: true } },
        userB: { select: { username: true } }
      }
    }),
    prisma.notificationPreference.findUnique({
      where: { userId },
      select: { wrappedReadyEmail: true, streakMilestoneEmail: true }
    })
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      name: user.name,
      email: user.email,
      username: user.username,
      timezone: user.timezone,
      locale: user.locale,
      createdAt: user.createdAt.toISOString()
    },
    githubAccount: user.githubAccount
      ? {
          scope: user.githubAccount.scope,
          tokenType: user.githubAccount.tokenType,
          expiresAt: user.githubAccount.expiresAt?.toISOString() ?? null
        }
      : null,
    repositories: repositories.map(
      (r: { name: string; fullName: string; private: boolean; url: string; createdAt: Date }) => ({
        name: r.name,
        fullName: r.fullName,
        private: r.private,
        url: r.url,
        createdAt: r.createdAt.toISOString()
      })
    ),
    commits: commits.map(
      (c: {
        sha: string;
        message: string;
        date: Date;
        author: string;
        authorEmail: string | null;
        repository: { fullName: string };
      }) => ({
        sha: c.sha,
        message: c.message,
        date: c.date.toISOString(),
        author: c.author,
        authorEmail: c.authorEmail,
        repository: c.repository.fullName
      })
    ),
    languageStats: languageStats.map(
      (l: {
        language: string;
        bytes: number;
        percentage: number;
        capturedAt: Date;
        repository: { fullName: string };
      }) => ({
        language: l.language,
        bytes: l.bytes,
        percentage: l.percentage,
        capturedAt: l.capturedAt.toISOString(),
        repository: l.repository.fullName
      })
    ),
    wrappedReports: wrappedReports.map(
      (w: {
        periodStart: Date;
        periodEnd: Date;
        totalCommits: number;
        totalRepositories: number;
        topLanguage: string | null;
        topRepository: string | null;
        longestStreak: number;
        isPublic: boolean;
        generatedAt: Date;
      }) => ({
        periodStart: w.periodStart.toISOString(),
        periodEnd: w.periodEnd.toISOString(),
        totalCommits: w.totalCommits,
        totalRepositories: w.totalRepositories,
        topLanguage: w.topLanguage,
        topRepository: w.topRepository,
        longestStreak: w.longestStreak,
        isPublic: w.isPublic,
        generatedAt: w.generatedAt.toISOString()
      })
    ),
    insights: insights.map(
      (i: { type: string; periodStart: Date; periodEnd: Date; narrative: string; createdAt: Date }) => ({
        type: i.type,
        periodStart: i.periodStart.toISOString(),
        periodEnd: i.periodEnd.toISOString(),
        narrative: i.narrative,
        createdAt: i.createdAt.toISOString()
      })
    ),
    badges: badges.map((b: { type: string; earnedAt: Date; metadata: unknown }) => ({
      type: b.type,
      earnedAt: b.earnedAt.toISOString(),
      metadata: b.metadata
    })),
    comparisons: comparisons.map(
      (c: {
        userAId: string;
        status: string;
        createdAt: Date;
        userA: { username: string | null };
        userB: { username: string | null };
      }) => {
        const isRequester = c.userAId === userId;
        return {
          otherUsername: isRequester ? c.userB.username : c.userA.username,
          status: c.status,
          direction: isRequester ? ("sent" as const) : ("received" as const),
          createdAt: c.createdAt.toISOString()
        };
      }
    ),
    notificationPreference: notificationPreference ?? null
  };
}
