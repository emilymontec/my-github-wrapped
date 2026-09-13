import { Inngest, EventSchemas } from "inngest";

/**
 * ⚠️ Corrección crítica (sección 32): Next.js/Vercel Route Handlers tienen
 * límites de tiempo de ejecución (10-60s según plan). Sincronizar un
 * usuario con decenas de miles de commits no cabe ahí. Todo el trabajo
 * pesado de sincronización va a través de este job queue (Inngest), nunca
 * directamente en un Route Handler.
 */

type Events = {
  "sync/user.requested": {
    data: { userId: string; mode: "initial" | "incremental" | "full" };
  };
  "insights/generate.requested": {
    data: { userId: string; periodStart: string; periodEnd: string };
  };
  "wrapped/generate.requested": {
    data: { userId: string; year: number };
  };
  "privacy/purge-private-repos.requested": {
    data: { userId: string };
  };
  "webhook/push.received": {
    data: {
      userId: string;
      repositoryGithubId: string;
      commits: {
        sha: string;
        message: string;
        authorName: string;
        authorEmail: string | null;
        timestamp: string;
      }[];
    };
  };
  "webhook/repository-deleted.received": {
    data: { repositoryGithubId: string };
  };
  // ⚠️ Fase 8: eventos propios, separados de "wrapped/generate.requested"
  // y "insights/generate.requested" -- mismo motivo que separar
  // insights de sync (sección de lib/jobs/insights.ts): si el envío del
  // email falla o el proveedor está caído, eso nunca debe hacer fallar
  // ni reintentar la generación del Wrapped o el otorgamiento del badge,
  // que ya se completaron con éxito antes de que este evento se dispare.
  "notifications/wrapped-ready.requested": {
    data: { userId: string; year: number };
  };
  "notifications/streak-milestone.requested": {
    data: { userId: string; badgeType: string; streakLength: number };
  };
  // ⚠️ Fase 10: ver lib/jobs/account-export.ts para el porqué de que
  // esto sea un job y no trabajo inline en el Route Handler.
  "account/export.requested": {
    data: { requestId: string; userId: string };
  };
};

export const inngest = new Inngest({
  id: "github-wrapped",
  schemas: new EventSchemas().fromRecord<Events>()
});
