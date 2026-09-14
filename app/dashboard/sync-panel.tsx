"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

type SyncState = {
  status: "IDLE" | "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number;
  errorMessage?: string | null;
};

/**
 * El Route Handler /sync solo encola el job (sección 32); este panel
 * hace polling de /sync (GET) para mostrar el progreso mientras
 * Inngest procesa la sincronización en segundo plano.
 *
 * ⚠️ Fase 9: corrige de paso una inconsistencia preexistente (mezcla de
 * inglés/español en el copy original, "Analyzing your GitHub..." /
 * "Syncing…" junto a texto en español) — ahora todo sale del
 * diccionario, en el idioma correcto de punta a punta.
 */
export function SyncPanel({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale).dashboard;
  const [state, setState] = useState<SyncState>({ status: "IDLE", progress: 0 });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/sync");
    if (!res.ok) return;
    const data: SyncState = await res.json();
    setState(data);

    if (data.status === "COMPLETED" || data.status === "FAILED") {
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus]);

  const startSync = async () => {
    const res = await fetch("/sync", {
      method: "POST",
      body: JSON.stringify({ mode: "initial" })
    });

    if (!res.ok) {
      // ⚠️ Corrección: antes esto se ignoraba en silencio (`return;`),
      // que es exactamente lo que dejaba el botón trabado diciendo
      // "Sincronizando..." sin que hubiera nada corriendo de verdad —
      // un 409 ("ya hay una sincronización en curso" por un intento
      // huérfano anterior) nunca se mostraba ni desbloqueaba nada.
      // Ahora se pide el estado real al servidor: si el 409 vino de un
      // syncState colgado, esto refleja lo que la base dice de verdad
      // en vez de mentir con "idle".
      await fetchStatus();
      return;
    }

    setState({ status: "QUEUED", progress: 0 });
    pollRef.current = setInterval(fetchStatus, 2000);
  };

  const isSyncing = state.status === "QUEUED" || state.status === "RUNNING";

  return (
    <div className="rounded-xl border border-neutral-800 bg-wrapped-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{dict.syncTitle}</p>
          <p className="text-sm text-neutral-400">
            {isSyncing ? dict.syncDescriptionActive : dict.syncDescriptionIdle}
          </p>
        </div>
        <button
          onClick={startSync}
          disabled={isSyncing}
          className="rounded-full bg-wrapped-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {isSyncing ? dict.syncButtonActive : dict.syncButtonIdle}
        </button>
      </div>

      {isSyncing && (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full bg-wrapped-accent transition-all"
            style={{ width: `${state.progress}%` }}
          />
        </div>
      )}

      {state.status === "FAILED" && (
        <p className="mt-3 text-sm text-red-400">{state.errorMessage ?? dict.syncGenericError}</p>
      )}
    </div>
  );
}
