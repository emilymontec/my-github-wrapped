import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { seedTestUser, TEST_SESSION_TOKEN } from "./seed";

/**
 * ⚠️ Bypass deliberado del flujo real de OAuth de GitHub: en vez de
 * automatizar el botón "Authorize" en el sitio real de GitHub (lento,
 * flaky, y requeriría credenciales de una cuenta de GitHub dedicada solo
 * para CI), este setup crea directamente la fila `Session` que Auth.js
 * (`session: { strategy: "database" }`, ver lib/auth/index.ts) espera
 * encontrar, y arma un `storageState` de Playwright con la cookie de
 * sesión ya puesta. Cada spec que use `test.use({ storageState:
 * "e2e/.auth/user.json" })` arranca ya logueado, sin pasar por
 * `/api/auth/*` en absoluto.
 *
 * Esto prueba todo lo que el producto controla (dashboard, Wrapped,
 * settings, permisos) sin volver a probar OAuth de GitHub en sí mismo,
 * que es infraestructura de un tercero, no código de este proyecto.
 */
export default async function globalSetup(): Promise<void> {
  const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const isSecure = baseURL.startsWith("https://");
  const hostname = new URL(baseURL).hostname;

  const prisma = new PrismaClient();
  try {
    await seedTestUser(prisma);
  } finally {
    await prisma.$disconnect();
  }

  // Auth.js v5 (`next-auth@5.0.0-beta`, ver package.json) usa el prefijo
  // `authjs.` para sus cookies. El prefijo `__Secure-` es obligatorio en
  // producción/HTTPS (lo exige el propio navegador para cookies
  // `Secure`), y ausente en HTTP local -- de ahí la rama por `isSecure`.
  const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";

  const storageState = {
    cookies: [
      {
        name: cookieName,
        value: TEST_SESSION_TOKEN,
        domain: hostname,
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        httpOnly: true,
        secure: isSecure,
        sameSite: "Lax" as const
      }
    ],
    origins: []
  };

  const authDir = path.join(__dirname, ".auth");
  fs.mkdirSync(authDir, { recursive: true });
  fs.writeFileSync(path.join(authDir, "user.json"), JSON.stringify(storageState, null, 2));

  await warmUpRoutes(baseURL, `${cookieName}=${TEST_SESSION_TOKEN}`);
}

/**
 * ⚠️ Warm-up de rutas -- la causa de los fallos en error.txt.
 *
 * Playwright arranca el `webServer` ANTES de correr `globalSetup`
 * (ver `createGlobalSetupTasks` en el runner: los plugins -- webServer --
 * se resuelven antes que el hook), así que en este punto la app ya está
 * escuchando en `baseURL`.
 *
 * El primer request a cada ruta es, con diferencia, el más lento de toda
 * la corrida: `next start` recién está exigiendo el bundle de esa ruta,
 * el motor de Prisma todavía no tiene ninguna conexión abierta y las
 * queries del seed corren en frío. Con el `expect` de 5000ms eso hacía
 * fallar exactamente el PRIMER test de cada archivo (dashboard, settings,
 * wrapped) mientras el resto -- ya con la ruta caliente -- pasaba.
 *
 * Pedir cada ruta una vez acá deja todo tibio antes del primer test, así
 * el intento #1 arranca en las mismas condiciones que el #2. Best-effort:
 * si una request falla no se aborta el setup, pero se imprime un warning
 * -- si una ruta redirige a `/` significa que la sesión no se resolvió,
 * que es exactamente el síntoma que queremos ver en el log de CI.
 */
async function warmUpRoutes(baseURL: string, cookieHeader: string): Promise<void> {
  const PREVIOUS_YEAR = new Date().getUTCFullYear() - 1;
  const routes = ["/", "/compare", "/dashboard", "/settings", `/wrapped/${PREVIOUS_YEAR}`];

  for (const route of routes) {
    try {
      const response = await fetch(new URL(route, baseURL), {
        headers: { cookie: cookieHeader },
        redirect: "follow"
      });
      const landedOn = new URL(response.url).pathname;
      if (response.status >= 400 || (route !== "/" && landedOn === "/")) {
        console.warn(
          `[e2e warm-up] ${route} respondió ${response.status} y terminó en "${landedOn}" ` +
            (landedOn === "/" ? "-- la sesión no se resolvió. " : "") +
            "El primer test de ese archivo va a fallar."
        );
      }
    } catch (error) {
      console.warn(
        `[e2e warm-up] no se pudo pedir ${route}:`,
        error instanceof Error ? error.message : error
      );
    }
  }
}
