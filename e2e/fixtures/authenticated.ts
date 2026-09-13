import { test as base, expect } from "@playwright/test";
import path from "node:path";

/**
 * Specs que necesitan sesión importan `test`/`expect` de este archivo en
 * vez de `@playwright/test` directamente -- centraliza el
 * `storageState` en un solo lugar, así que si el mecanismo de auth
 * cambia (ver e2e/global-setup.ts) solo hay que tocar acá.
 */
export const test = base.extend({});

test.use({ storageState: path.join(__dirname, "../.auth/user.json") });

export { expect };
