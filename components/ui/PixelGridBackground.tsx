"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo compartido del rediseño "frío": grid técnico + paneles sólidos de
 * borde duro con muescas rectangulares recortadas (silueta escalonada,
 * tipo Tetris/bento) + matrices de puntos — el mismo vocabulario de la
 * referencia (bloques 2D planos, grid visible, dot matrix), en
 * violeta/azul/cian sobre negro azulado en vez de verde-lima.
 *
 * A propósito NO usa blur ni glow radial difuminado en los paneles: cada
 * forma tiene un `clip-path` con esquinas exactas — es lo que hace que
 * lea como "bloque 2D" y no como "mancha de luz ambiental" (ver
 * globals.css, sección .pixel-shape). La única transición de color suave
 * que existe es la franja inferior (.pixel-glow-strip), que imita la
 * "fuente de luz" del pie de la referencia sin desenfocar ningún borde.
 *
 * Deliberadamente NO es el mismo componente que GlassCubeField (el de
 * las slides del Wrapped): ese es vidrio 3D con blur porque ahí el cubo
 * ES la casilla de un commit vuelta objeto. Acá el bloque es plano y sin
 * transparencia porque el lenguaje es "panel de control", no "año en
 * revisión".
 *
 * Interactivo: parallax sutil con el mouse (custom properties vía ref,
 * sin re-render). Respeta prefers-reduced-motion.
 */
export function PixelGridBackground({ variant = "default" }: { variant?: "default" | "quiet" }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    function handlePointerMove(e: PointerEvent) {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        el?.style.setProperty("--gx", nx.toFixed(4));
        el?.style.setProperty("--gy", ny.toFixed(4));
      });
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="pixel-grid-bg" aria-hidden="true">
      <div className="pixel-grid-lines" />
      <div className="pixel-glow-strip" />
      <div className="pixel-shape pixel-shape--tl" />
      <div className="pixel-shape pixel-shape--tr" />
      {variant === "default" && (
        <>
          <div className="pixel-shape pixel-shape--mid" />
          <div className="pixel-dots pixel-dots--a" />
          <div className="pixel-dots pixel-dots--b" />
        </>
      )}
      <div className="pixel-grid-vignette" />
    </div>
  );
}
