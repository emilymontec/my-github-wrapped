"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

// Un solo campo para los dos modos -- si tiene "@" es un email (la
// persona puede no tener cuenta todavía), si no es un username de
// GitHub Wrapped existente. Separar en dos inputs/tabs hubiera sido más
// "correcto" pero también más fricción para el caso común: la mayoría
// de las veces la persona ya sabe cuál de los dos tiene a mano.
function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

export function InviteForm({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale).comparisons;
  const router = useRouter();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    setNotice(null);

    const isEmail = looksLikeEmail(trimmed);
    const res = await fetch("/comparisons", {
      method: "POST",
      body: JSON.stringify(isEmail ? { email: trimmed } : { username: trimmed })
    });

    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setError(data?.error ?? dict.inviteGenericError);
      return;
    }

    setValue("");

    // "pending_invite" = la persona todavía no tiene cuenta -- no hay
    // nada nuevo que mostrar en la lista de abajo (ComparisonLink no
    // existe hasta que acepte), así que la única confirmación posible
    // es un aviso de que el email salió (o no).
    if (data?.kind === "pending_invite") {
      setNotice(data.emailSent ? dict.inviteEmailSent : dict.inviteEmailFailed);
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={dict.inviteInputPlaceholder}
          className="flex-1 rounded-lg border border-cool-line/20 bg-cool-muted/10 px-3 py-2 text-sm text-cool-text placeholder:text-cool-muted/50"
        />
        <button
          type="submit"
          disabled={submitting}
          className="shrink-0 rounded-lg bg-cool-violet px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? dict.inviteSending : dict.inviteButton}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      {notice && <p className="mt-2 text-sm text-cool-muted">{notice}</p>}
    </div>
  );
}
