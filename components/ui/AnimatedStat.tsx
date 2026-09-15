"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Número que cuenta hacia arriba cuando entra en pantalla, en vez de
 * aparecer estático. Es la pieza de "interactividad" del dashboard: el
 * usuario nota que los stats reaccionan a su scroll, no son texto muerto.
 *
 * Usa IntersectionObserver (dispara una sola vez) + requestAnimationFrame
 * con easing, no un `setInterval` ingenuo — para que la velocidad de
 * conteo no dependa de cuántos stats haya en pantalla a la vez.
 * Respeta prefers-reduced-motion mostrando el valor final directo.
 */
export function AnimatedStat({
  value,
  duration = 1200,
  format = (n: number) => Math.round(n).toLocaleString(),
  className
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;

        const start = performance.now();
        function tick(now: number) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // ease-out cubic: arranca rápido, desacelera al final —
          // se siente más "vivo" que una interpolación lineal.
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(value * eased);
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  );
}
