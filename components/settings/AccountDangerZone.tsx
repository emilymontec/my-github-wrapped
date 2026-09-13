"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

interface AccountDangerZoneProps {
  username: string;
  locale: Locale;
}

/**
 * ⚠️ La acción MÁS irreversible del producto (a diferencia de desactivar
 * repos privados, esto no se puede "volver a activar" después) — por
 * eso el nivel de fricción más alto: confirmación de dos pasos como
 * `PrivateReposToggle`, MÁS tipear el username exacto, mismo patrón que
 * usan GitHub/Vercel para borrar un repo u organización. El botón de
 * confirmación final queda deshabilitado hasta que el texto matchee
 * exactamente — no alcanza con haber abierto el diálogo.
 */
export function AccountDangerZone({ username, locale }: AccountDangerZoneProps) {
  const dict = getDictionary(locale).settings.deleteAccount;
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirmText === username;

  async function handleDelete() {
    if (!matches) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/account", {
      method: "DELETE",
      body: JSON.stringify({ confirmUsername: confirmText })
    });

    if (!res.ok) {
      setSubmitting(false);
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? dict.genericError);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-neutral-400">{dict.description}</p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-full bg-red-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
        >
          {dict.deleteButton}
        </button>
      ) : (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <label className="mb-2 block text-sm text-neutral-300">
            {t(dict.confirmLabel, { username })}
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={dict.confirmPlaceholder}
            className="mb-3 w-full rounded-lg border border-wrapped-border bg-black/20 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setConfirmText("");
                setError(null);
              }}
              className="rounded-full px-3 py-2 text-sm text-neutral-400 hover:text-neutral-200"
            >
              {dict.cancelButton}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!matches || submitting}
              className="rounded-full bg-red-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? dict.deleting : dict.confirmButton}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
