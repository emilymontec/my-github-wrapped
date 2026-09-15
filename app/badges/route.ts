import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getBadgeInfo, type BadgeType } from "@/lib/gamification/badges";
import { getRequestLocale } from "@/lib/i18n/server";

// ⚠️ Igual que en /analytics, /wrapped y /sync: sin esto Next.js puede
// tratar este GET como estático/cacheable y no reflejar badges nuevos
// recién otorgados.
export const dynamic = "force-dynamic";

/**
 * Route Handler delgado: solo lee lo que ya otorgó
 * lib/gamification/persist.ts (vía el job de insights). Nunca calcula
 * elegibilidad aquí — eso viviría en una request HTTP síncrona, contrario
 * al principio de job queue (sección 32).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [badges, locale] = await Promise.all([
    prisma.badge.findMany({
      where: { userId: session.user.id },
      orderBy: { earnedAt: "desc" }
    }),
    getRequestLocale()
  ]);

  const withInfo = badges.map((b: { type: string; earnedAt: Date; metadata: unknown }) => ({
    type: b.type,
    earnedAt: b.earnedAt,
    metadata: b.metadata,
    ...getBadgeInfo(b.type as BadgeType, locale)
  }));

  return NextResponse.json({ badges: withInfo });
}
