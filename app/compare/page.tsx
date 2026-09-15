import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listComparisonsForUser } from "@/lib/comparisons/service";
import { InviteForm } from "@/components/comparisons/InviteForm";
import { ComparisonRow } from "@/components/comparisons/ComparisonRow";
import { getRequestDictionary } from "@/lib/i18n/server";
import { PixelGridBackground } from "@/components/ui/PixelGridBackground";
import { BackLink } from "@/components/ui/BackLink";

/**
 * Server Component — la protección de ruta vive aquí (mismo motivo que
 * app/dashboard/page.tsx: middleware.ts existe desde la Fase 9 pero solo
 * para locale, no para auth — ver esa nota para el porqué).
 */
export default async function ComparePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const [comparisons, { locale, dict }] = await Promise.all([
    listComparisonsForUser(session.user.id),
    getRequestDictionary()
  ]);

  return (
    <main className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <PixelGridBackground variant="quiet" />
      <div className="relative z-10">
      <BackLink href="/dashboard" label={dict.common.backToDashboard} />
      <h1 className="mb-2 font-display text-2xl font-semibold text-white">{dict.comparisons.pageTitle}</h1>
      <p className="mb-8 text-sm text-cool-muted">{dict.comparisons.pageDescription}</p>

      <div className="mb-8">
        <InviteForm locale={locale} />
      </div>

      {comparisons.length === 0 ? (
        <p className="text-sm text-cool-muted/70">{dict.comparisons.emptyList}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comparisons.map((c) => (
            <ComparisonRow key={c.id} comparison={c} locale={locale} />
          ))}
        </div>
      )}
    </div>
    </main>
  );
}
