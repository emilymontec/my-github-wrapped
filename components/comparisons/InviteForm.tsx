"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

export function InviteForm({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale).comparisons;
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;

    setSubmitting(true);
    setError(null);

    const res = await fetch("/comparisons", {
      method: "POST",
      body: JSON.stringify({ username: username.trim() })
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? dict.inviteGenericError);
      return;
    }

    setUsername("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder={dict.inviteInputPlaceholder}
        className="flex-1 rounded-lg border border-wrapped-border bg-black/20 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600"
      />
      <button
        type="submit"
        disabled={submitting}
        className="shrink-0 rounded-lg bg-wrapped-accent px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? dict.inviteSending : dict.inviteButton}
      </button>
      {error && <p className="ml-2 self-center text-sm text-red-400">{error}</p>}
    </form>
  );
}
