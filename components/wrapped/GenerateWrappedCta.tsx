"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { getDictionary, t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

interface GenerateWrappedCtaProps {
  year: number;
  isClosed: boolean;
  locale: Locale;
}

export function GenerateWrappedCta({ year, isClosed, locale }: GenerateWrappedCtaProps) {
  const dict = getDictionary(locale).wrapped;
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function pollUntilReady() {
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/wrapped?year=${year}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "ready") {
        if (pollRef.current) clearInterval(pollRef.current);
        router.refresh();
      }
    }, 3000);
  }

  async function handleGenerate() {
    setStatus("generating");
    setErrorMessage(null);

    const res = await fetch("/wrapped", {
      method: "POST",
      body: JSON.stringify({ year })
    });

    if (res.status === 409) {
      // Ya existe (año cerrado) — solo hace falta refrescar para verlo.
      router.refresh();
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus("error");
      setErrorMessage(data?.error ?? dict.generateGenericError);
      return;
    }

    const data = await res.json();
    if (data.status === "already_fresh") {
      router.refresh();
      return;
    }

    pollUntilReady();
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="max-w-sm text-neutral-400">
        {isClosed
          ? t(dict.notGeneratedYet, { year })
          : t(dict.inProgress, { year })}
      </p>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={status === "generating"}
        className="rounded-full bg-wrapped-accent px-6 py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-50"
      >
        {status === "generating" ? dict.generating : dict.generateButton}
      </button>
      {status === "error" && <p className="text-sm text-red-400">{errorMessage}</p>}
    </div>
  );
}
