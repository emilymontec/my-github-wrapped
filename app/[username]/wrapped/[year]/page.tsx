import { notFound } from "next/navigation";
import { getPublicWrappedPageData } from "@/lib/wrapped/service";
import { WrappedSlideDeck } from "@/components/wrapped/WrappedSlideDeck";
import { getRequestLocale } from "@/lib/i18n/server";

interface PublicWrappedPageProps {
  params: { username: string; year: string };
}

/**
 * Ruta 100% pública — sin `auth()`, sin sesión, alcanzable por cualquiera
 * con el link (sección Fase 4: "página pública de solo lectura... sin
 * necesidad de login"). Ver la auditoría de qué se expone en
 * `lib/wrapped/service.ts::getPublicWrappedPageData`.
 *
 * ⚠️ Limitación conocida: como Next.js prioriza rutas estáticas sobre
 * dinámicas en el mismo nivel, un usuario de GitHub cuyo username sea
 * literalmente "api", "dashboard" o "wrapped" no sería alcanzable en
 * `/[username]/...` (esos segmentos ya existen como rutas propias de la
 * app). Caso extremadamente raro, documentado para no sorprender a nadie
 * que lo encuentre más adelante.
 */
export default async function PublicWrappedPage({ params }: PublicWrappedPageProps) {
  const year = Number(params.year);
  if (!Number.isInteger(year) || year < 2008 || year > 9999) {
    notFound();
  }

  const data = await getPublicWrappedPageData(params.username, year);

  // Mismo 404 tanto si el usuario no existe como si el reporte es
  // privado — nunca confirmar cuál de los dos es (ver comentario en el
  // servicio).
  if (!data) {
    notFound();
  }

  const locale = await getRequestLocale();

  return <WrappedSlideDeck slides={data.slides} year={year} mode="public" locale={locale} />;
}
