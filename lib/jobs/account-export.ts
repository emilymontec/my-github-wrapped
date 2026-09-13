import { inngest } from "@/lib/jobs/client";
import { prisma } from "@/lib/db/prisma";
import { buildAccountExport } from "@/lib/account/export";

/**
 * Route Handler (app/account/export/route.ts) solo crea la fila
 * `DataExportRequest` en QUEUED y encola este evento — el trabajo real
 * (leer potencialmente decenas de miles de commits) ocurre acá, vía
 * Inngest, nunca en el ciclo de vida de la request HTTP.
 *
 * ⚠️ A diferencia de `lib/jobs/sync.ts` (que no marca FAILED
 * explícitamente si un paso lanza — gap preexistente, fuera de alcance
 * de esta fase), este job SÍ envuelve el trabajo en try/catch: una
 * `DataExportRequest` es un estado nuevo, visible para el usuario en
 * `/settings`, y quedarse en RUNNING para siempre sin explicación sería
 * peor que nunca haber ofrecido feedback de progreso.
 */
export const generateAccountExport = inngest.createFunction(
  { id: "generate-account-export", retries: 2 },
  { event: "account/export.requested" },
  async ({ event, step }) => {
    const { requestId, userId } = event.data;

    await step.run("mark-running", () =>
      prisma.dataExportRequest.update({ where: { id: requestId }, data: { status: "RUNNING" } })
    );

    try {
      const data = await step.run("build-export", () => buildAccountExport(userId));

      await step.run("mark-completed", () =>
        prisma.dataExportRequest.update({
          where: { id: requestId },
          data: { status: "COMPLETED", data, completedAt: new Date() }
        })
      );

      return { status: "completed" as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido generando el export.";
      await step.run("mark-failed", () =>
        prisma.dataExportRequest.update({
          where: { id: requestId },
          data: { status: "FAILED", errorMessage: message }
        })
      );
      throw error; // deja que Inngest registre el fallo y aplique sus reintentos
    }
  }
);
