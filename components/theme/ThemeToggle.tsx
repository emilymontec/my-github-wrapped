"use client";

import { useEffect, useState } from "react";

/**
 * El tema inicial ya se aplicó antes del primer pintado por el script
 * inline en app/layout.tsx (evita el flash) -- este componente solo
 * lee el atributo ya puesto en <html> para saber en qué estado arrancar
 * su propio ícono, y desde acá en adelante es quien manda: guarda en
 * localStorage y togglea el atributo.
 */
export function ThemeToggle({ label }: { label?: string }) {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.getAttribute("data-theme") === "light");
  }, []);

  function toggle() {
    const next = !isLight;
    setIsLight(next);
    document.documentElement.setAttribute("data-theme", next ? "light" : "dark");
    if (!next) {
      // "dark" es el default sin atributo -- lo sacamos en vez de
      // escribir data-theme="dark" para que el selector [data-theme="dark"]
      // quede reservado exclusivamente para el forzado del Wrapped (ver
      // globals.css), y <html> nunca compita con eso.
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      // localStorage puede fallar (modo privado, cuota) -- el toggle
      // sigue funcionando para esta sesión, solo no persiste.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label ?? "Cambiar tema"}
      title={label ?? "Cambiar tema"}
      className="btn-flat-outline !p-2.5"
    >
      {isLight ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 10.5A2.5 2.5 0 1 0 8 5.5a2.5 2.5 0 0 0 0 5ZM8 1v1.4M8 13.6V15M2.6 8H1M15 8h-1.6M3.5 3.5l1 1M11.5 11.5l1 1M12.5 3.5l-1 1M4.5 11.5l-1 1"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M13.5 9.5A5.5 5.5 0 1 1 6.5 2.5a4.3 4.3 0 0 0 7 7Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
