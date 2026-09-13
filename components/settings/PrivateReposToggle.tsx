"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

interface PrivateReposToggleProps {
  initialEnabled: boolean;
  enabledAt: Date | null;
  locale: Locale;
}

/**
 * ⚠️ Requiere un click de confirmación explícito en ambas direcciones —
 * activar y desactivar. Activar amplía qué datos se leen (sensible);
 * desactivar dispara un borrado real de datos ya sincronizados
 * (irreversible). Ninguna de las dos acciones debería poder dispararse
 * por accidente con un solo click.
 */
export function PrivateReposToggle({ initialEnabled, enabledAt, locale }: PrivateReposToggleProps) {
  const dict = getDictionary(locale).settings.privateRepos;
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commit() {
    setSubmitting(true);
    setError(null);
    const next = !enabled;

    const res = await fetch("/settings/private-repos", {
      method: "PATCH",
      body: JSON.stringify({ enabled: next })
    });

    setSubmitting(false);
    setConfirming(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? dict.genericError);
      return;
    }

    setEnabled(next);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-200">
            {enabled ? dict.includedLabel : dict.notIncludedLabel}
          </p>
          {enabled && enabledAt && (
            <p className="text-xs text-neutral-500">
              {t(dict.enabledOnLabel, { date: enabledAt.toLocaleDateString(locale) })}
            </p>
          )}
        </div>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              enabled ? "bg-white/10 text-neutral-200 hover:bg-white/20" : "bg-wrapped-accent text-black hover:opacity-90"
            }`}
          >
            {enabled ? dict.disableButton : dict.enableButton}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full px-3 py-2 text-sm text-neutral-400 hover:text-neutral-200"
            >
              {dict.cancelButton}
            </button>
            <button
              type="button"
              onClick={commit}
              disabled={submitting}
              className="rounded-full bg-red-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {submitting ? dict.applying : enabled ? dict.confirmDisable : dict.confirmEnable}
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
