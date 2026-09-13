import { inngest } from "@/lib/jobs/client";
import { prisma } from "@/lib/db/prisma";
import { FANOUT_PAGE_SIZE, buildCursorPageArgs, isLastPage } from "@/lib/jobs/fanout";

/**
 * Generación automática del Wrapped anual (sección Alcance, Fase 7): en
 * vez de depender de que el usuario lo pida, este cron revisa a diario
 * si ya empezó un año nuevo y, de ser así, encola la generación del
 * Wrapped del año recién cerrado para cada usuario con actividad.
 *
 * Correr esto a diario (no solo el 1 de enero) es deliberado: si el
 * cron del 1 de enero fallara por cualquier motivo, el chequeo de los
 * días siguientes lo cubre igual, sin esperar a la próxima Nochevieja.
 * `lib/jobs/wrapped.ts` ya es idempotente (nunca regenera un año
 * cerrado que ya tiene reporte), así que encolar esto todos los días
 * del año para el mismo `previousYear` es seguro — la mayoría de los
 * días simplemente no hacen nada porque ya está generado.
 *
 * ⚠️ Fase 8: este cron ya no es "silencioso" -- `lib/jobs/wrapped.ts`
 * dispara `notifications/wrapped-ready.requested` la primera vez que un
 * año cerrado se genera, así que el usuario recibe un email sin tener
 * que visitar `/wrapped/[year]` para enterarse. La idempotencia diaria
 * de este cron (descrita arriba) sigue siendo segura porque el email
 * está deduplicado por `NotificationLog` (userId, "wrapped_ready", year)
 * -- reintentar el mismo `previousYear` en los días siguientes nunca
 * reenvía el aviso.
 *
 * ⚠️ Fase 11: fan-out paginado por cursor sobre `User.id` — mismo
 * razonamiento que `reconcile.ts` (ver lib/jobs/fanout.ts): un
 * `step.sendEvent` por página con el batch completo, no uno por usuario.
 * La idempotencia de `lib/jobs/wrapped.ts` sigue siendo la que hace
 * seguro reintentar/reencolar sin duplicar trabajo, independientemente
 * de cómo se pagine el fan-out.
 */
export const autoGenerateClosedYearWrapped = inngest.createFunction(
  { id: "auto-generate-closed-year-wrapped" },
  { cron: "0 6 * * *" }, // diario, 6am UTC
  async ({ step }) => {
    const previousYear = new Date().getUTCFullYear() - 1;

    let cursor: string | null = null;
    let totalChecked = 0;
    let pageIndex = 0;

    while (true) {
      const page = await step.run(`list-users-with-data-page-${pageIndex}`, async (): Promise<string[]> => {
        const users = await prisma.user.findMany({
          where: { commits: { some: {} } },
          select: { id: true },
          orderBy: { id: "asc" },
          ...buildCursorPageArgs("id", cursor, FANOUT_PAGE_SIZE)
        });
        return users.map((u: { id: string }) => u.id);
      });

      if (page.length === 0) break;

      await step.sendEvent(
        `auto-generate-wrapped-batch-${pageIndex}-${previousYear}`,
        page.map((userId) => ({
          name: "wrapped/generate.requested" as const,
          data: { userId, year: previousYear }
        }))
      );

      totalChecked += page.length;
      cursor = page[page.length - 1];
      pageIndex += 1;

      if (isLastPage(page.length, FANOUT_PAGE_SIZE)) break;
    }

    return { usersChecked: totalChecked, pages: pageIndex, year: previousYear };
  }
);
