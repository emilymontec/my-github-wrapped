"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ComparisonSummary } from "@/lib/comparisons/service";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

export function ComparisonRow({ comparison, locale }: { comparison: ComparisonSummary; locale: Locale }) {
  const dict = getDictionary(locale).comparisons;
  const STATUS_LABELS: Record<ComparisonSummary["status"], string> = {
    PENDING: dict.statusPending,
    ACCEPTED: dict.statusAccepted,
    DECLINED: dict.statusDeclined
  };

  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function respond(action: "accept" | "revoke") {
    setSubmitting(true);
    await fetch(`/comparisons/${comparison.id}`, {
      method: "PATCH",
      body: JSON.stringify({ action })
    });
    setSubmitting(false);
    router.refresh();
  }

  const canAccept = comparison.status === "PENDING" && comparison.direction === "received";
  const canRevoke = comparison.status !== "DECLINED";

  return (
    <div className="flex items-center justify-between bento-panel p-4">
      <div>
        <p className="text-sm text-white">
          {comparison.direction === "sent" ? `${dict.invitedPrefix} ` : `${dict.invitedByPrefix} `}
          <span className="font-medium text-white">{comparison.otherUsername}</span>
        </p>
        <p className="text-xs text-cool-muted/70">{STATUS_LABELS[comparison.status]}</p>
      </div>

      <div className="flex items-center gap-2">
        {comparison.status === "ACCEPTED" && (
          <Link
            href={`/compare/${comparison.id}`}
            className="rounded-full bg-cool-violet px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            {dict.viewComparison}
          </Link>
        )}
        {canAccept && (
          <button
            type="button"
            onClick={() => respond("accept")}
            disabled={submitting}
            className="rounded-full bg-cool-violet px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {dict.accept}
          </button>
        )}
        {canRevoke && (
          <button
            type="button"
            onClick={() => respond("revoke")}
            disabled={submitting}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-cool-muted hover:bg-white/20 disabled:opacity-50"
          >
            {comparison.status === "PENDING" ? dict.cancel : dict.revoke}
          </button>
        )}
      </div>
    </div>
  );
}
