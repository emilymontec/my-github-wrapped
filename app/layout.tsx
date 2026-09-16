import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { getRequestLocale } from "@/lib/i18n/server";
import "./globals.css";

// Space Grotesk para números/headings grandes — tiene ese carácter un
// poco técnico y geométrico que encaja con "estadísticas de código" sin
// caer en el monospace-para-todo genérico. Manrope para el cuerpo: limpia
// y neutra a tamaños pequeños, donde Space Grotesk se siente pesada.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"]
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  title: "GitHub Wrapped",
  description: "Descubre cómo programaste este año."
};

// ⚠️ Corre ANTES del primer pintado (script inline en <head>, no un
// useEffect -- un useEffect corre después de que React ya montó con el
// tema default, así que por una fracción de segundo se vería el tema
// equivocado y después "saltaría" al correcto). Lee la preferencia
// guardada (o el tema del sistema operativo si nunca la tocó) y aplica
// `data-theme` en <html> de una, sin esperar a que hidrate React.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var storedTheme = localStorage.getItem("theme");
    var theme = storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    if (theme === "light") document.documentElement.setAttribute("data-theme", "light");

    var storedPalette = localStorage.getItem("palette");
    if (storedPalette === "yellow" || storedPalette === "red" || storedPalette === "green") {
      document.documentElement.setAttribute("data-palette", storedPalette);
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // ⚠️ Fase 9, alcance parcial a propósito: solo el atributo `lang` del
  // `<html>` se conecta acá -- el `metadata` de arriba (title/description)
  // se queda hardcodeado en español por ahora. Hacerlo dinámico requiere
  // `generateMetadata` (no se puede leer cookies/sesión desde un
  // `export const metadata` estático), lo cual es una migración aparte
  // que no se hizo en esta pasada porque no bloquea nada de lo demás.
  const locale = await getRequestLocale();

  return (
    <html lang={locale} className={`${spaceGrotesk.variable} ${manrope.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-cool-ink text-cool-text min-h-screen antialiased font-body">{children}</body>
    </html>
  );
}
