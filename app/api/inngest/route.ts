import { serve } from "inngest/next";
import { inngest } from "@/lib/jobs/client";
import { syncUserData } from "@/lib/jobs/sync";
import { generateUserInsights } from "@/lib/jobs/insights";
import { generateWrappedReport } from "@/lib/jobs/wrapped";
import { purgePrivateRepoData } from "@/lib/jobs/purge-private-repos";
import { handleWebhookPush } from "@/lib/jobs/webhook-push";
import { handleWebhookRepositoryDeleted } from "@/lib/jobs/webhook-repository-deleted";
import { reconcileAllUsers } from "@/lib/jobs/reconcile";
import { autoGenerateClosedYearWrapped } from "@/lib/jobs/wrapped-auto-generate";
import {
  sendWrappedReadyNotification,
  sendStreakMilestoneNotification
} from "@/lib/jobs/notifications";
import { generateAccountExport } from "@/lib/jobs/account-export";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    syncUserData,
    generateUserInsights,
    generateWrappedReport,
    purgePrivateRepoData,
    handleWebhookPush,
    handleWebhookRepositoryDeleted,
    reconcileAllUsers,
    autoGenerateClosedYearWrapped,
    sendWrappedReadyNotification,
    sendStreakMilestoneNotification,
    generateAccountExport
  ]
});
