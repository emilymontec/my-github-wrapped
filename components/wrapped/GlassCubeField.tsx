"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * Fondo ambiental de "cubos de vidrio" para el Wrapped.
 *
 * Paleta: violeta/cian del sistema "frío" del rediseño — NO la escala
 * `heat` del contribution graph. Los cubos son decoración ambiental, no
 * codifican datos reales (eso lo hace `ActivityHeatmap.tsx`, que sigue
 * usando `heat` porque ahí el color SÍ significa "cuánto se commiteó
 * ese día" y tiene que seguir leyéndose como el contribution graph real
 * de GitHub). Mezclar ambas paletas en el mismo componente sería
 * confuso: un cubo violeta flotando no debe hacer pensar "esto fue un
 * día de mucha actividad".
 *
 * Interactividad: la parada de mouse aplica un parallax sutil (los cubos
 * más "cercanos" — z-index/escala mayor — se mueven más que los
 * lejanos). Se escribe directo a custom properties vía ref, sin setState,
 * para no re-renderizar 12 nodos en cada mousemove. Respeta
 * prefers-reduced-motion: sin rotación continua ni parallax si el
 * usuario lo pidió.
 */

const CUBE_COLORS = ["#3b82f6", "#8b5cf6", "#a78bfa", "#22d3ee"] as const;

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
  // ⚠️ Bajado de 16/10 a 8/6: cada cubo son 2 caras con transform 3D
  // animado infinito — aunque ya sin backdrop-filter (ver globals.css),
  // seguía siendo mucha superficie compuesta en simultáneo para siempre
  // mientras el Wrapped está abierto. Menos cubos, mismo efecto visual.
  const cubes = useMemo(() => makeCubes(density === "dense" ? 8 : 6), [density]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // ⚠️ Si el usuario cambia de pestaña con el Wrapped abierto de
    // fondo, la animación 3D en loop infinito seguía corriendo y
    // gastando GPU sin que nadie la viera — sumado al costo ya alto de
    // tener varios cubos animados, esto podía sostener la carga por
    // horas sin que el usuario se diera cuenta. La pausamos cuando la
    // pestaña no está visible.
    function handleVisibilityChange() {
      el?.style.setProperty("--play-state", document.hidden ? "paused" : "running");
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

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
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
