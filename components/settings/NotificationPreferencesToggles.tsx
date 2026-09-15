"use client";

import { useState } from "react";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

interface NotificationPreferencesTogglesProps {
  initialWrappedReadyEmail: boolean;
  initialStreakMilestoneEmail: boolean;
  locale: Locale;
}

/**
 * ⚠️ A diferencia de `PrivateReposToggle`, esto NO pide confirmación: es
 * reversible, no borra datos, y no amplía qué información se lee de
 * GitHub -- prender/apagar un aviso por email es una acción de bajo
 * riesgo (mismo criterio que justifica el default `true` en el schema,
 * ver `NotificationPreference`). Optimista: el estado visual cambia al
 * click y se revierte solo si el PATCH falla.
 */
export function NotificationPreferencesToggles({
  initialWrappedReadyEmail,
  initialStreakMilestoneEmail,
  locale
}: NotificationPreferencesTogglesProps) {
  const dict = getDictionary(locale).settings;
  const [wrappedReadyEmail, setWrappedReadyEmail] = useState(initialWrappedReadyEmail);
  const [streakMilestoneEmail, setStreakMilestoneEmail] = useState(initialStreakMilestoneEmail);
  const [error, setError] = useState<string | null>(null);

  async function toggle(
    key: "wrappedReadyEmail" | "streakMilestoneEmail",
    current: boolean,
    setCurrent: (v: boolean) => void
  ) {
    const next = !current;
    setCurrent(next); // optimista
    setError(null);

    const res = await fetch("/settings/notifications", {
      method: "PATCH",
      body: JSON.stringify({ [key]: next })
    });

    if (!res.ok) {
      setCurrent(current); // revertir
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? dict.preferenceUpdateError);
    }
  }

  return (
    <div className="space-y-4">
      <ToggleRow
        label={dict.wrappedReadyLabel}
        description={dict.wrappedReadyDescription}
        checked={wrappedReadyEmail}
        onChange={() => toggle("wrappedReadyEmail", wrappedReadyEmail, setWrappedReadyEmail)}
      />
      <ToggleRow
        label={dict.streakMilestoneLabel}
        description={dict.streakMilestoneDescription}
        checked={streakMilestoneEmail}
        onChange={() => toggle("streakMilestoneEmail", streakMilestoneEmail, setStreakMilestoneEmail)}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-cool-muted/70">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-cool-violet" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
