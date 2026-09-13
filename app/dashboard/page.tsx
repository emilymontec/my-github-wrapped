import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getAnalyticsWithScore } from "@/lib/analytics/service";
import { getInsightsForUser } from "@/lib/insights/service";
import { SyncPanel } from "@/app/dashboard/sync-panel";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { EmptyState } from "@/components/dashboard/EmptyState";
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
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{dict.common.appName}</h1>
          <p className="text-neutral-400">{t(dict.dashboard.greeting, { name: session.user.name ?? "developer" })}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="rounded-full border border-wrapped-border px-4 py-2 text-sm text-neutral-300 hover:border-wrapped-accent hover:text-wrapped-accent"
          >
            {dict.dashboard.settingsLink}
          </Link>
          <Link
            href="/compare"
            className="rounded-full border border-wrapped-border px-4 py-2 text-sm text-neutral-300 hover:border-wrapped-accent hover:text-wrapped-accent"
          >
            {dict.dashboard.compareLink}
          </Link>
          <Link
            href={`/wrapped/${new Date().getUTCFullYear()}`}
            className="rounded-full border border-wrapped-border px-4 py-2 text-sm text-neutral-300 hover:border-wrapped-accent hover:text-wrapped-accent"
          >
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
    </main>
  );
}
