"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo compartido del rediseño "frío": grid técnico + bloques de color
 * sólidos anclados a esquinas + un par de matrices de puntos — el mismo
 * vocabulario de la referencia (bento grid, bloques geométricos, dot
 * matrix) pero en violeta/cian sobre negro azulado en vez de verde-lima,
 * y sin logos/branding ajenos.
 *
 * Deliberadamente NO es el mismo componente que GlassCubeField (el de
 * las slides del Wrapped): ese es vidrio 3D con la paleta heat porque
 * ahí el cubo ES la casilla de un commit. Acá el bloque es plano y 2D
 * porque el lenguaje es "panel de control", no "año en revisión" — daría
 * lo mismo forzar ambos a compartir componente que forzar el mismo tipo
 * de letra para un titular y una tabla.
 *
 * Interactivo: parallax sutil con el mouse (igual mecanismo que
 * GlassCubeField — custom properties vía ref, sin re-render). Respeta
 * prefers-reduced-motion.
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
      <div className="pixel-block pixel-block--violet pixel-block--tl" />
      <div className="pixel-block pixel-block--cyan pixel-block--br" />
      {variant === "default" && (
        <>
          <div className="pixel-block pixel-block--violet-dim pixel-block--mid" />
          <div className="pixel-dots pixel-dots--a" />
          <div className="pixel-dots pixel-dots--b" />
        </>
      )}
      <div className="pixel-grid-vignette" />
    </div>
  );
}
