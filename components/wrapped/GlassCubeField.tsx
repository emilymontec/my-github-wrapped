"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * Fondo ambiental de "cubos de vidrio" para el Wrapped.
 *
 * Por qué cubos: son el mismo vocabulario visual que las casillas del
 * contribution graph de GitHub (el material del que está hecho este
 * producto), solo que en 3D y traslúcidas — no es una textura decorativa
 * genérica, es la casilla de un commit vuelta objeto. Los 4 tonos de
 * verde son exactamente la escala `heat` de tailwind.config.ts (la misma
 * que ya usa el heatmap real), así que el fondo y los datos comparten
 * paleta a propósito.
 *
 * Es LA cosa audaz de la pantalla (ver frontend-design skill: "spend your
 * boldness in one place") — por eso el resto de cada slide vive en un
 * panel de vidrio esmerilado quieto y sobrio (.glass-panel en
 * globals.css), no hay más movimiento ambiental compitiendo por atención.
 *
 * Interactividad: la parada de mouse aplica un parallax sutil (los cubos
 * más "cercanos" — z-index/escala mayor — se mueven más que los
 * lejanos). Se escribe directo a custom properties vía ref, sin setState,
 * para no re-renderizar 12 nodos en cada mousemove. Respeta
 * prefers-reduced-motion: sin rotación continua ni parallax si el
 * usuario lo pidió.
 */

const CUBE_COLORS = ["#0e4429", "#006d32", "#26a641", "#39d353"] as const;

interface CubeSpec {
  id: number;
  size: number;
  top: string;
  left: string;
  color: string;
  duration: number;
  delay: number;
  depth: number; // 0 (lejos) a 1 (cerca) — controla fuerza del parallax
  rotateAxis: "x" | "y" | "diag";
}

// Generador determinístico (mismo seed en cada slide) para que el campo
// de cubos no "salte" al cambiar de slide — solo el contenido cambia.
function makeCubes(count: number): CubeSpec[] {
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: 28 + rand() * 64,
    top: `${rand() * 100}%`,
    left: `${rand() * 100}%`,
    color: CUBE_COLORS[Math.floor(rand() * CUBE_COLORS.length)],
    duration: 14 + rand() * 16,
    delay: -rand() * 20,
    depth: 0.3 + rand() * 0.7,
    rotateAxis: (["x", "y", "diag"] as const)[Math.floor(rand() * 3)]
  }));
}

export function GlassCubeField({ density = "normal" }: { density?: "normal" | "dense" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cubes = useMemo(() => makeCubes(density === "dense" ? 16 : 10), [density]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    function handlePointerMove(e: PointerEvent) {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        el?.style.setProperty("--px", nx.toFixed(4));
        el?.style.setProperty("--py", ny.toFixed(4));
      });
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={containerRef} className="cube-field" aria-hidden="true">
      {cubes.map((cube) => (
        <div
          key={cube.id}
          className={`cube cube--${cube.rotateAxis}`}
          style={
            {
              width: cube.size,
              height: cube.size,
              top: cube.top,
              left: cube.left,
              animationDuration: `${cube.duration}s`,
              animationDelay: `${cube.delay}s`,
              "--cube-depth": cube.depth
            } as React.CSSProperties
          }
        >
          <span className="cube-face cube-face--front" style={{ background: cube.color }} />
          <span className="cube-face cube-face--back" style={{ background: cube.color }} />
        </div>
      ))}
    </div>
  );
}
