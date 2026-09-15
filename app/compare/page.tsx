import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listComparisonsForUser } from "@/lib/comparisons/service";
import { InviteForm } from "@/components/comparisons/InviteForm";
import { ComparisonRow } from "@/components/comparisons/ComparisonRow";
import { getRequestDictionary } from "@/lib/i18n/server";
import { PixelGridBackground } from "@/components/ui/PixelGridBackground";

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
    <main className="relative mx-auto max-w-2xl px-6 py-12">
      <PixelGridBackground variant="quiet" />
      <div className="relative z-10">
      <h1 className="mb-2 font-display text-2xl font-semibold text-white">{dict.comparisons.pageTitle}</h1>
      <p className="mb-8 text-sm text-neutral-400">{dict.comparisons.pageDescription}</p>

      <div className="mb-8">
        <InviteForm locale={locale} />
      </div>

      {comparisons.length === 0 ? (
        <p className="text-sm text-neutral-500">{dict.comparisons.emptyList}</p>
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
