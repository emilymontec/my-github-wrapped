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
  const prisma = new PrismaClient();
  try {
    await seedTestUser(prisma);
  } finally {
    await prisma.$disconnect();
  }

  const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const isSecure = baseURL.startsWith("https://");
  const hostname = new URL(baseURL).hostname;

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
}
