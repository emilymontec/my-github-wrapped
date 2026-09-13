import { inngest } from "@/lib/jobs/client";
import { prisma } from "@/lib/db/prisma";
import { FANOUT_PAGE_SIZE, buildCursorPageArgs, isLastPage } from "@/lib/jobs/fanout";

/**
 * Reconciliación periódica (sección Consideraciones, Fase 7): los
 * webhooks son un canal adicional, no un reemplazo del polling. Este
 * cron corre independientemente de si los webhooks llegaron o no, y
 * encola una sync incremental para cada usuario con la cuenta conectada
 * — cubre exactamente el caso "el webhook se perdió" sin que el usuario
 * tenga que notarlo ni actuar.
 *
 * ⚠️ Fase 11: fan-out paginado por cursor sobre `GitHubAccount.userId`
 * (campo `@unique`, cursor válido para Prisma) — cada página hace UN
 * `step.sendEvent` con el batch completo de esa página, no un evento por
 * usuario (ver razonamiento en lib/jobs/fanout.ts). Reemplaza la versión
 * anterior, que hacía un `step.run` sin paginar + un `step.sendEvent`
 * por usuario dentro de un `for`.
 */
export const reconcileAllUsers = inngest.createFunction(
  { id: "reconcile-all-users" },
  { cron: "0 4 * * *" }, // diario, 4am UTC — fuera de horas pico esperadas
  async ({ step }) => {
    let cursor: string | null = null;
    let totalReconciled = 0;
    let pageIndex = 0;

    while (true) {
      const page = await step.run(`list-connected-users-page-${pageIndex}`, async (): Promise<string[]> => {
        const accounts = await prisma.gitHubAccount.findMany({
          select: { userId: true },
          orderBy: { userId: "asc" },
          ...buildCursorPageArgs("userId", cursor, FANOUT_PAGE_SIZE)
        });
        return accounts.map((a: { userId: string }) => a.userId);
      });

      if (page.length === 0) break;

      await step.sendEvent(
        `reconcile-sync-batch-${pageIndex}`,
        page.map((userId) => ({
          name: "sync/user.requested" as const,
          data: { userId, mode: "incremental" as const }
        }))
      );

      totalReconciled += page.length;
      cursor = page[page.length - 1];
      pageIndex += 1;

      if (isLastPage(page.length, FANOUT_PAGE_SIZE)) break;
    }

    return { usersReconciled: totalReconciled, pages: pageIndex };
  }
);
