import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getWrappedPageData } from "@/lib/wrapped/service";
import { WrappedSlideDeck } from "@/components/wrapped/WrappedSlideDeck";
import { GenerateWrappedCta } from "@/components/wrapped/GenerateWrappedCta";
import { getRequestLocale } from "@/lib/i18n/server";

interface WrappedPageProps {
  params: { year: string };
}

/**
 * Server Component (sección Fase 3, Trabajo técnico): carga
 * WrappedReport + Insight ya persistidos vía lib/wrapped/service.ts, sin
 * disparar ninguna llamada de IA en esta request. Si el reporte no
 * existe todavía, muestra el CTA de generación en vez de un error.
 *
 * ⚠️ La protección de esta ruta vive aquí, en el Server Component — no
 * en middleware.ts (que desde la Fase 9 existe, pero solo resuelve el
 * locale del navegador, no auth: session strategy "database" +
 * node:crypto no corren en el Edge Runtime, ver nota en
 * app/dashboard/page.tsx).
 */
export default async function WrappedPage({ params }: WrappedPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const year = Number(params.year);
  if (!Number.isInteger(year) || year < 2008 || year > 9999) {
    notFound();
  }

  // ⚠️ Se necesita el `username` (login de GitHub) por separado de
  // `session.user.name` (nombre para mostrar): el username es el que
  // arma la URL pública compartible (`/[username]/wrapped/[year]`,
  // Fase 4), y puede no coincidir con el nombre para mostrar.
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { username: true, name: true }
  });

  const [data, locale] = await Promise.all([
    getWrappedPageData(session.user.id, year, user.name ?? "developer"),
    getRequestLocale()
  ]);

  if (data.status === "not_generated") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-wrapped-bg px-6">
        <h1 className="font-display text-2xl font-semibold text-white">Wrapped {year}</h1>
        <GenerateWrappedCta year={year} isClosed={data.isClosed} locale={locale} />
      </main>
    );
  }

  return (
    <WrappedSlideDeck
      slides={data.slides}
      year={year}
      mode="private"
      username={user.username}
      initialIsPublic={data.isPublic}
      locale={locale}
    />
  );
}
