"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface InviteAcceptActionsProps {
  token: string;
  copy: { accept: string; decline: string };
}

/**
 * Client Component chico y sin i18n propio -- recibe el texto ya
 * resuelto por el Server Component padre (mismo patrón que evita
 * duplicar `getDictionary` en cada componente hoja chico, ver
 * ComparisonRow.tsx para el caso "grande" que sí lo hace porque
 * necesita más de dos strings).
 */
export function InviteAcceptActions({ token, copy }: InviteAcceptActionsProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"accept" | "decline" | null>(null);

  async function respond(action: "accept" | "decline") {
    setSubmitting(action);
    const res = await fetch(`/comparisons/invite/${token}`, {
      method: "PATCH",
      body: JSON.stringify({ action })
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(null);

    if (res.ok && action === "accept" && data?.comparisonLinkId) {
      router.push(`/compare/${data.comparisonLinkId}`);
      return;
    }

    router.push("/compare");
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => respond("accept")}
        disabled={submitting !== null}
        className="btn-cool disabled:opacity-50"
      >
        {copy.accept}
      </button>
      <button
        type="button"
        onClick={() => respond("decline")}
        disabled={submitting !== null}
        className="btn-flat-outline disabled:opacity-50"
      >
        {copy.decline}
      </button>
    </div>
  );
}
