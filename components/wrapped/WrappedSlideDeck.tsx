"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { WrappedSlide } from "@/lib/wrapped/types";
import { SlideRenderer } from "@/components/wrapped/SlideRenderer";
import { ShareControls } from "@/components/wrapped/ShareControls";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/locales";

interface WrappedSlideDeckPrivateProps {
  slides: WrappedSlide[];
  year: number;
  mode: "private";
  username: string | null;
  initialIsPublic: boolean;
  locale: Locale;
}

interface WrappedSlideDeckPublicProps {
  slides: WrappedSlide[];
  year: number;
  mode: "public";
  locale: Locale;
}

type WrappedSlideDeckProps = WrappedSlideDeckPrivateProps | WrappedSlideDeckPublicProps;

const AUTOPLAY_INTERVAL_MS = 6000;

const variants = {
  enter: (direction: number) => ({ x: direction > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -60 : 60, opacity: 0 })
};

/**
 * Componente client-side puro (Fase 3): recibe los slides ya armados por
 * `buildWrappedSlides` vía props. No sabe nada de Prisma, del Analytics
 * Engine ni de insights — solo navega y anima lo que le dan.
 *
 * Fase 4 (Sharing): el mismo componente sirve tanto la vista privada del
 * dueño (con controles de compartir) como la vista pública de solo
 * lectura — la diferencia es el prop `mode`. El panel de compartir
 * (`ShareControls`) solo se monta si `mode === "private"`, así que un
 * visitante anónimo en `/[username]/wrapped/[year]` nunca ve, ni puede
 * activar, ningún control de privacidad ajeno.
 */
export function WrappedSlideDeck(props: WrappedSlideDeckProps) {
  const { slides, year, mode, locale } = props;
  const dict = getDictionary(locale).wrapped;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const total = slides.length;

  const goTo = useCallback(
    (nextIndex: number, dir: number) => {
      setDirection(dir);
      setIndex(Math.max(0, Math.min(total - 1, nextIndex)));
    },
    [total]
  );

  const next = useCallback(() => goTo(index + 1, 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1, -1), [goTo, index]);

  // Navegación por teclado. Deshabilitada mientras el panel de compartir
  // está abierto, para que flechas/espacio no avancen slides por debajo
  // de un modal que además tiene su propio input de texto.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (shareOpen) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setIsPlaying(false);
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIsPlaying(false);
        prev();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [next, prev, shareOpen]);

  // Autoplay: avanza solo mientras isPlaying está activo; se detiene solo
  // al llegar al último slide, no hace loop (es "tu año", no un carrusel
  // infinito). También se pausa si el panel de compartir está abierto.
  useEffect(() => {
    if (!isPlaying || shareOpen) return;
    if (index >= total - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => goTo(index + 1, 1), AUTOPLAY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, shareOpen, index, total, goTo]);

  function handleTouchStart(e: React.TouchEvent) {
    if (shareOpen) return;
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (shareOpen || touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    const SWIPE_THRESHOLD = 50;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
      // No fue un swipe — tratar como tap: tercio izquierdo retrocede,
      // resto avanza (convención de "stories").
      const tapX = e.changedTouches[0].clientX;
      const isLeftThird = tapX < window.innerWidth / 3;
      setIsPlaying(false);
      if (isLeftThird) prev();
      else next();
      return;
    }

    setIsPlaying(false);
    if (deltaX < 0) next();
    else prev();
  }

  const closeHref = mode === "private" ? "/dashboard" : "/";

  return (
    <div className="fixed inset-0 z-50 select-none bg-cool-ink">
      {/* Barra de progreso estilo "stories" */}
      <div className="absolute left-0 right-0 top-0 z-10 flex gap-1 p-3">
        {slides.map((_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: i <= index ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      <Link
        href={closeHref}
        className="absolute right-3 top-8 z-10 rounded-full bg-black/30 px-3 py-1 text-sm text-white/80 hover:bg-black/50"
        aria-label={dict.closeAria}
      >
        {dict.closeButton}
      </Link>

      <div
        className="relative h-full w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={index}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <SlideRenderer slide={slides[index]} locale={locale} />
          </motion.div>
        </AnimatePresence>

        {!shareOpen && (
          <>
            {/* Zonas de tap invisibles para desktop (click, no solo touch).
                ⚠️ Corrección: antes eran `h-full`, es decir, cubrían TODA
                la pantalla — incluida la franja inferior donde vive el
                botón visible de "Reproducir automáticamente". Cualquier
                click ahí competía con el botón real por debajo, y en
                touch (mobile) ese tipo de superposición es aún más
                propenso a robarse el tap. Ahora paran antes de esa franja
                (bottom-20) y arrancan debajo de la barra de progreso /
                botón de cerrar (top-16), así ninguna zona invisible
                comparte pixel con un control visible real. */}
            <button
              type="button"
              aria-label={dict.prevAria}
              onClick={() => {
                setIsPlaying(false);
                prev();
              }}
              className="absolute left-0 top-16 bottom-20 w-1/3 cursor-w-resize"
            />
            <button
              type="button"
              aria-label={dict.nextAria}
              onClick={() => {
                setIsPlaying(false);
                next();
              }}
              className="absolute right-0 top-16 bottom-20 w-2/3 cursor-e-resize"
            />
          </>
        )}

        {mode === "private" && shareOpen && (
          <ShareControls
            year={year}
            username={props.username ?? ""}
            currentSlide={slides[index]}
            initialIsPublic={props.initialIsPublic}
            onClose={() => setShareOpen(false)}
            locale={locale}
          />
        )}
      </div>

      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4">
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          className="rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
        >
          {isPlaying ? dict.pauseAutoplay : dict.playAutoplay}
        </button>
        {mode === "private" && (
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setShareOpen(true);
            }}
            className="rounded-full bg-cool-violet px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {dict.shareButton}
          </button>
        )}
        <span className="text-xs text-white/50">
          {index + 1} / {total} · {year}
        </span>
      </div>
    </div>
  );
}
