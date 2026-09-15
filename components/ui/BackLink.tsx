import Link from "next/link";

/**
 * Falta en settings, compare, compare/[id] y score: una vez que entrás
 * a esos módulos, la única forma de volver era el botón "atrás" del
 * navegador. Este componente es el mismo patrón en las 4 vistas, para
 * que no diverjan con el tiempo (mismo problema que tuvimos con las
 * rutas /sync duplicadas).
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center gap-1.5 text-sm text-cool-muted transition-colors hover:text-cool-violetBright"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M10 12.5 5.5 8 10 3.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </Link>
  );
}
