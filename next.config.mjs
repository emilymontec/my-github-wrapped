/**
 * ⚠️ CORRECCIÓN (auditoría Fase 13, Hallazgo 2): faltaban headers de
 * seguridad HTTP. Importa especialmente para las páginas públicas de
 * compartir (/[username]/wrapped/[year]), pensadas para ser visitadas
 * por terceros vía link -- exactamente la superficie donde un CSP evita
 * que la página sea embebida en un iframe malicioso (clickjacking) o que
 * contenido de terceros inyecte scripts arbitrarios.
 *
 * `img-src` incluye avatars.githubusercontent.com (ya usado en
 * `images.remotePatterns`) y `data:` (necesario para las imágenes
 * Open Graph generadas con `ImageResponse`, ver
 * app/[username]/wrapped/[year]/opengraph-image.tsx).
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: https://avatars.githubusercontent.com",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "frame-ancestors 'none'"
    ].join("; ")
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "avatars.githubusercontent.com" }]
  },
  async headers() {
    return [
      {
        // Todas las rutas menos los Route Handlers de la API: /api/inngest
        // y /api/webhooks/github reciben requests de terceros (Inngest,
        // GitHub) que no deben chocar con un CSP pensado para HTML.
        source: "/((?!api/).*)",
        headers: SECURITY_HEADERS
      }
    ];
  }
};

export default nextConfig;
