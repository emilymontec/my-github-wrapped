"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locales";

interface LanguageToggleProps {
  currentLocale: Locale;
  spanishLabel: string;
  englishLabel: string;
}

/**
 * ⚠️ `router.refresh()` tras el POST, no un cambio de estado local: el
 * texto traducido viene de Server Components (`getRequestDictionary`),
 * así que la única forma de que el resto de la página (y el próximo
 * email que se le mande al usuario) reflejen el cambio es re-renderizar
 * desde el server con la cookie ya actualizada.
 */
export function LanguageToggle({ currentLocale, spanishLabel, englishLabel }: LanguageToggleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function selectLocale(locale: Locale) {
    if (locale === currentLocale) return;
    setError(null);

    const res = await fetch("/settings/locale", {
      method: "POST",
      body: JSON.stringify({ locale })
    });

    if (!res.ok) {
      setError("No se pudo cambiar el idioma.");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-full border border-cool-line/20 p-1">
        {(["es", "en"] as const).map((locale) => (
          <button
            key={locale}
            type="button"
            disabled={pending}
            onClick={() => selectLocale(locale)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              currentLocale === locale ? "bg-cool-violet text-white" : "text-cool-muted hover:text-white"
            }`}
          >
            {locale === "es" ? spanishLabel : englishLabel}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
