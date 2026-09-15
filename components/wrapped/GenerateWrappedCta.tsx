"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getDictionary, t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

interface GenerateWrappedCtaProps {
  year: number;
  isClosed: boolean;
  locale: Locale;
}

// A partir de este tiempo sin resultado, dejamos de fingir que "ya casi
// está" y mostramos la advertencia de que está tardando más de lo
// normal — con Analytics Engine + Insights Engine + una llamada real a
// Hugging Face para la narración, un Wrapped con muchos commits puede
// tardar más que el resto, y quedarse mudo ahí es peor que avisar.
const SLOW_THRESHOLD_SECONDS = 25;
const STEP_ROTATE_MS = 3500;
const POLL_INTERVAL_MS = 3000;

export function GenerateWrappedCta({ year, isClosed, locale }: GenerateWrappedCtaProps) {
  const dict = getDictionary(locale).wrapped;
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearAllTimers() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    if (stepRef.current) clearInterval(stepRef.current);
  }

  // ⚠️ Corrección: antes esto polleaba para siempre sin límite y sin
  // limpiar el interval al desmontar el componente (navegar fuera de la
  // página a mitad de una generación dejaba el setInterval corriendo en
  // el vacío). Ahora se limpia siempre, y además hay una salida manual
  // ("Revisar ahora") para cuando el usuario quiere confirmar el estado
  // real sin esperar a que se cumplan los 3s del próximo tick.
  useEffect(() => clearAllTimers, []);

  async function checkStatus() {
    const res = await fetch(`/wrapped?year=${year}`, { cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.status === "ready") {
      clearAllTimers();
      router.refresh();
      return true;
    }
    return false;
  }

  function startWaitingState() {
    setStatus("generating");
    setErrorMessage(null);
    setElapsedSeconds(0);
    setStepIndex(0);

    pollRef.current = setInterval(checkStatus, POLL_INTERVAL_MS);
    tickRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    stepRef.current = setInterval(
      () => setStepIndex((i) => (i + 1) % dict.generatingSteps.length),
      STEP_ROTATE_MS
    );
  }

  async function handleGenerate() {
    startWaitingState();

    const res = await fetch("/wrapped", {
      method: "POST",
      body: JSON.stringify({ year })
    });

    if (res.status === 409) {
      // Ya existe (año cerrado) — solo hace falta refrescar para verlo.
      clearAllTimers();
      router.refresh();
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      clearAllTimers();
      setStatus("error");
      setErrorMessage(data?.error ?? dict.generateGenericError);
      return;
    }

    const data = await res.json();
    if (data.status === "already_fresh") {
      clearAllTimers();
      router.refresh();
      return;
    }

    // El POST ya encoló el job — el polling de arriba (ya arrancado en
    // startWaitingState) se encarga del resto.
  }

  const isSlow = status === "generating" && elapsedSeconds >= SLOW_THRESHOLD_SECONDS;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="max-w-sm text-cool-muted">
        {isClosed ? t(dict.notGeneratedYet, { year }) : t(dict.inProgress, { year })}
      </p>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={status === "generating"}
        className="btn-cool"
      >
        {status === "generating" ? dict.generating : dict.generateButton}
      </button>

      {status === "generating" && (
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm text-cool-muted transition-opacity duration-300" key={stepIndex}>
            {dict.generatingSteps[stepIndex]}
          </p>
          <p className="text-xs tabular-nums text-cool-muted/60">
            {t(dict.generateElapsed, { seconds: elapsedSeconds })}
          </p>
        </div>
      )}

      {isSlow && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-cool-violet/20 bg-cool-violet/5 px-4 py-3">
          <p className="max-w-xs text-sm text-cool-violetBright">{dict.generateSlowWarning}</p>
          <button
            type="button"
            onClick={checkStatus}
            className="text-xs font-semibold text-cool-cyan underline underline-offset-2 hover:text-white"
          >
            {dict.generateCheckNow}
          </button>
        </div>
      )}

      {status === "error" && <p className="text-sm text-red-400">{errorMessage}</p>}
    </div>
  );
}
