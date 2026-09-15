import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getAnalyticsWithScore } from "@/lib/analytics/service";
import { getInsightsForUser } from "@/lib/insights/service";
import { SyncPanel } from "@/app/dashboard/sync-panel";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PixelGridBackground } from "@/components/ui/PixelGridBackground";
import { getRequestDictionary } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/dictionary";
import type { PersistedInsight } from "@/lib/insights/types";

const DEFAULT_PERIOD = "last30" as const;

export default async function DashboardPage() {
  // ⚠️ La protección de esta ruta vive aquí, no en middleware.ts. La
  // Fase 9 SÍ agregó un middleware.ts, pero solo para detectar el
  // locale del navegador (lib/i18n/resolve.ts, sin auth ni DB) — sigue
  // sin poder proteger rutas: este proyecto usa
  // `session: { strategy: "database" }` + Prisma adapter + cifrado de
  // tokens con `node:crypto` (lib/auth/crypto.ts), y ninguno de los dos
  // corre en el Edge Runtime, que es donde Next.js ejecuta
  // middleware.ts por defecto. Un middleware que reexportara `auth`
  // desde lib/auth/index.ts fallaría en build/runtime (se detectó
  // exactamente este error al compilar, en la Fase 0). El check de
  // sesión en un Server Component corre en Node.js, así que aquí sí es
  // seguro.
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const userId = session.user.id;

  const syncState = await prisma.syncState.findUnique({ where: { userId } });
  const neverSynced = !syncState || syncState.status === "IDLE";

  // El render inicial usa el mismo servicio que /analytics — nunca
  // duplica la lógica de armar el rango de fechas o correr el Analytics
  // Engine (sección 13). Desde la Fase 5, getAnalyticsWithScore trae el
  // Developer Activity Score junto con el resto.
  const [analyticsWithScore, insights] = neverSynced
    ? [null, []]
    : await Promise.all([
        getAnalyticsWithScore(userId, DEFAULT_PERIOD),
        getInsightsForUser(userId)
      ]);

  const { locale, dict } = await getRequestDictionary();

  return (
    <main className="relative mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-10">
      <PixelGridBackground variant="quiet" />
      <div className="relative z-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-white">{dict.common.appName}</h1>
            <p className="text-cool-muted">{t(dict.dashboard.greeting, { name: session.user.name ?? "developer" })}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/settings" className="btn-flat-outline">
              {dict.dashboard.settingsLink}
            </Link>
            <Link href="/compare" className="btn-flat-outline">
              {dict.dashboard.compareLink}
            </Link>
            <Link href={`/wrapped/${new Date().getUTCFullYear()}`} className="btn-flat-outline">
              {t(dict.dashboard.viewWrappedLink, { year: new Date().getUTCFullYear() })}
            </Link>
          </div>
        </header>

        <div className="mb-8">
          <SyncPanel locale={locale} />
        </div>

        {neverSynced || !analyticsWithScore ? (
          <EmptyState title={dict.dashboard.emptyStateTitle} description={dict.dashboard.emptyStateDescription} />
        ) : (
          <DashboardClient
            initialPeriod={DEFAULT_PERIOD}
            initialData={{
              analytics: analyticsWithScore.analytics,
              score: analyticsWithScore.score,
              insights: insights as PersistedInsight[]
            }}
            locale={locale}
          />
        )}
      </div>
    </main>
  );
}
