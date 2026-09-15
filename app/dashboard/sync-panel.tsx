"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDictionary, t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

type SyncState = {
  status: "IDLE" | "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number;
  errorMessage?: string | null;
  lastSyncedAt?: string | null;
};

// Si nunca sincronizó, o la última vez fue hace más de esto, se
// auto-sincroniza sola al entrar al dashboard — sin que el usuario tenga
// que apretar nada. El botón deja de ser el protagonista de la tarjeta y
// pasa a ser un ícono secundario para forzar un refresh manual si
// alguien lo quiere antes de que toque la próxima auto-sync.
const AUTO_SYNC_AFTER_MS = 6 * 60 * 60 * 1000; // 6 horas

function formatRelativeTime(iso: string, locale: Locale): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return rtf.format(-diffHours, "hour");
  return rtf.format(-Math.round(diffHours / 24), "day");
}

/**
 * El Route Handler /sync solo encola el job (sección 32); este panel
 * hace polling de /sync (GET) para mostrar el progreso mientras
 * Inngest procesa la sincronización en segundo plano.
 *
 * ⚠️ Rediseño: antes esto era un botón grande "Sincronizar" que el
 * usuario tenía que apretar cada vez — con el efecto secundario de que
 * cualquier bug en el flujo (estado huérfano, caching) se sentía como
 * "la app está rota" porque el botón era lo primero que se veía. Ahora
 * la sincronización pasa sola en segundo plano (auto-sync si pasaron más
 * de AUTO_SYNC_AFTER_MS desde la última vez) y el botón queda como
 * acción secundaria opcional, no obligatoria.
 */
export function SyncPanel({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale).dashboard;
  const [state, setState] = useState<SyncState>({ status: "IDLE", progress: 0 });
  const [hasCheckedInitial, setHasCheckedInitial] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/sync", { cache: "no-store" });
    if (!res.ok) return null;
    const data: SyncState = await res.json();
    setState(data);

    if (data.status === "COMPLETED" || data.status === "FAILED") {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return data;
  }, []);

  const startSync = useCallback(async () => {
    const res = await fetch("/sync", {
      method: "POST",
      body: JSON.stringify({ mode: "initial" })
    });

    if (!res.ok) {
      // ⚠️ Antes esto se ignoraba en silencio — un 409 por un intento
      // huérfano nunca se mostraba ni desbloqueaba nada. Ahora se pide
      // el estado real al servidor (que además se auto-repara solo si
      // estaba colgado hace rato, ver app/sync/route.ts).
      await fetchStatus();
      return;
    }

    setState({ status: "QUEUED", progress: 0 });
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchStatus, 2000);
  }, [fetchStatus]);

  // Chequeo inicial: trae el estado real, y si corresponde auto-sync
  // (nunca sincronizó, o la última vez fue hace más de 6h), la dispara
  // sola sin esperar un click.
  useEffect(() => {
    (async () => {
      const data = await fetchStatus();
      setHasCheckedInitial(true);

      if (!data) return;
      const isActive = data.status === "QUEUED" || data.status === "RUNNING";
      if (isActive) {
        pollRef.current = setInterval(fetchStatus, 2000);
        return;
      }

      const isStale =
        !data.lastSyncedAt || Date.now() - new Date(data.lastSyncedAt).getTime() > AUTO_SYNC_AFTER_MS;
      if (isStale) startSync();
    })();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSyncing = state.status === "QUEUED" || state.status === "RUNNING";

  return (
    <div className="bento-panel p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-white">{dict.syncTitle}</p>
          <p className="truncate text-sm text-cool-muted">
            {isSyncing
              ? dict.syncDescriptionActive
              : state.lastSyncedAt
                ? t(dict.syncLastSynced, { when: formatRelativeTime(state.lastSyncedAt, locale) })
                : hasCheckedInitial
                  ? dict.syncNeverSynced
                  : dict.syncDescriptionIdle}
          </p>
        </div>

        <button
          onClick={startSync}
          disabled={isSyncing}
          aria-label={dict.syncRefreshAria}
          title={dict.syncButtonIdle}
          className="btn-flat-outline shrink-0 !p-2.5"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={isSyncing ? "animate-spin" : ""}
            aria-hidden="true"
          >
            <path
              d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {isSyncing && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cool-violet to-cool-cyan transition-all duration-500"
            style={{ width: `${state.progress}%` }}
          />
        </div>
      )}

      {state.status === "FAILED" && (
        <p className="mt-2 text-xs text-red-400">{state.errorMessage ?? dict.syncGenericError}</p>
      )}
    </div>
  );
}
