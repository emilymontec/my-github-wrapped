"use client";

import { useEffect, useRef, useState } from "react";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

interface ExportRequest {
  id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
}

/**
 * Mismo patrón de polling que `sync-panel.tsx` (el trabajo real corre en
 * `lib/jobs/account-export.ts` vía Inngest, este componente solo
 * consulta el estado). Al montar, primero pregunta si ya existe una
 * solicitud reciente -- así refrescar la página no pierde de vista un
 * export que quedó "generando".
 */
export function DataExportPanel({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale).settings.dataExport;
  const [request, setRequest] = useState<ExportRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/account/export")
      .then((res) => (res.ok ? res.json() : { request: null }))
      .then((data) => {
        if (data.request && (data.request.status === "QUEUED" || data.request.status === "RUNNING")) {
          setRequest(data.request);
          pollRef.current = setInterval(poll, 3000);
        } else if (data.request) {
          setRequest(data.request);
        }
      });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function poll() {
    const res = await fetch("/account/export");
    if (!res.ok) return;
    const data = await res.json();
    if (data.request) setRequest(data.request);
    if (data.request?.status === "COMPLETED" || data.request?.status === "FAILED") {
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }

  async function requestExport() {
    setError(null);
    const res = await fetch("/account/export", { method: "POST" });

    if (res.status === 429) {
      setError(dict.rateLimitError);
      return;
    }
    if (!res.ok) {
      setError(dict.genericError);
      return;
    }

    const data = await res.json();
    setRequest(data);
    pollRef.current = setInterval(poll, 3000);
  }

  const isPending = request?.status === "QUEUED" || request?.status === "RUNNING";

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-cool-muted">{dict.description}</p>

      {!request && (
        <button
          type="button"
          onClick={requestExport}
          className="rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          {dict.requestButton}
        </button>
      )}

      {isPending && (
        <p className="text-sm text-cool-muted">
          {request.status === "QUEUED" ? dict.statusQueued : dict.statusRunning}
        </p>
      )}

      {request?.status === "COMPLETED" && (
        <div className="flex items-center gap-3">
          <a
            href={`/account/export/${request.id}/download`}
            className="rounded-full bg-cool-violet px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {dict.downloadButton}
          </a>
          <button type="button" onClick={requestExport} className="text-sm text-cool-muted hover:text-white">
            {dict.requestAnother}
          </button>
        </div>
      )}

      {request?.status === "FAILED" && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-red-400">{dict.statusFailed}</p>
          <button type="button" onClick={requestExport} className="text-sm text-cool-muted hover:text-white">
            {dict.requestAnother}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
