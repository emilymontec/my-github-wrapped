# Guía de despliegue — GitHub Wrapped en Vercel

Esta guía asume que partís del código de este zip (post auditoría Fase 13 + reorganización de rutas) y que todavía no tenés nada desplegado. Seguila en orden — cada paso depende del anterior.

---

## 0. Qué cambió en las rutas (leer antes de seguir)

Se sacó el prefijo `/api/` de casi todos los endpoints para que las URLs sean más limpias. **Tres rutas se mantuvieron bajo `/api/` a propósito**, porque moverlas rompería integraciones externas reales, no es una elección estética:

| Ruta | Por qué se queda en `/api/` |
|---|---|
| `/api/auth/*` | Auth.js (NextAuth v5) usa `/api/auth/*` como convención hardcodeada por defecto. Moverla exige configurar `basePath` en `lib/auth/index.ts` **y** cambiar la Authorization callback URL ya registrada en tu GitHub OAuth App — es una dependencia externa, no solo de código. |
| `/api/webhooks/github` | Es la URL que este mismo proyecto le registra a GitHub por cada repo (`lib/jobs/sync.ts` → `registerRepoWebhookBestEffort`). Si ya tenés webhooks registrados en producción apuntando a esa URL, cambiarla los deja huérfanos hasta el próximo re-registro. |
| `/api/inngest` | Es la URL que configurás manualmente en el dashboard de Inngest como "serve URL" de tu app. Es config externa, no de código. |

Todo lo demás (`/account`, `/analytics`, `/badges`, `/comparisons`, `/insights`, `/settings/*`, `/sync`, `/wrapped`) ya no lleva el prefijo `/api/`, tanto en los Route Handlers como en cada `fetch(...)` del frontend que los llama — ya está actualizado en este zip, no tenés que tocar nada de eso.

---

## 1. Prerrequisitos — cuentas que necesitás crear

Antes de tocar Vercel, tené a mano:

1. **Repositorio en GitHub** con este código (Vercel se conecta a un repo, no a un zip).
2. **Base de datos PostgreSQL administrada.** Recomendado: [Neon](https://neon.tech) o [Supabase](https://supabase.com) (ambos tienen plan gratuito y funcionan bien con el modelo serverless de Vercel — usá siempre la connection string en modo *pooled*, no la directa, para `DATABASE_URL`).
3. **Cuenta en [Inngest](https://www.inngest.com)** (plan gratuito alcanza para empezar) — acá corren todos los jobs pesados (sync, insights, wrapped, purga de repos privados, reconciliación diaria).
4. **GitHub OAuth App** — la creás en el paso 3, todavía no.
5. Opcional pero recomendado: **cuenta en [Resend](https://resend.com)** (emails transaccionales) y **API key de Anthropic** (narración de insights con IA). El proyecto funciona sin ninguna de las dos — cae a plantillas/no-op documentados — pero con ellas la experiencia es mejor.

---

## 2. Primer deploy a Vercel (sin funcionalidad todavía)

Hacemos un primer deploy vacío de variables para conseguir la URL de producción (`https://tu-proyecto.vercel.app` o tu dominio), porque la vas a necesitar para configurar el OAuth App y el webhook en los pasos siguientes — es más simple que adivinar la URL antes.

1. Entrá a [vercel.com/new](https://vercel.com/new) e importá el repositorio.
2. Vercel detecta automáticamente Next.js (hay un `vercel.json` en la raíz que lo confirma explícitamente, pero no hace falta tocarlo).
3. **Todavía no le pongas variables de entorno** — dejá que falle el primer build si hace falta, o simplemente anotá la URL que Vercel te asigna en el dashboard del proyecto antes de que termine. Esa URL es tu `<PROD_URL>` para el resto de esta guía.

> Si preferís no depender de un build fallido: Vercel muestra la URL del proyecto ("Domains") apenas creás el proyecto, incluso antes del primer deploy exitoso.

---

## 3. Crear la GitHub OAuth App

1. Andá a **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App** (o directo: <https://github.com/settings/applications/new>).
2. Completá:
   - **Homepage URL**: `https://<PROD_URL>`
   - **Authorization callback URL**: `https://<PROD_URL>/api/auth/callback/github` — **con `/api/`**, no lo cambies (ver sección 0).
3. Generá el **Client Secret** (además del Client ID que ya te muestra).
4. Guardá ambos valores — los usás en el paso 5 (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`).

---

## 4. Configurar la base de datos

1. Creá el proyecto/base en Neon o Supabase.
2. Copiá la **connection string pooled** (en Neon: la que dice "Pooled connection"; en Supabase: la de "Transaction" mode, puerto 6543) — Vercel ejecuta cada Route Handler como una función serverless independiente, y sin pooling vas a agotar las conexiones de Postgres rápido.
3. Guardala como `DATABASE_URL`.
4. Todavía no corras las migraciones — eso es el paso 7, después de tener las env vars puestas en Vercel.

---

## 5. Variables de entorno — dónde conseguir cada una

Cargalas en **Vercel → tu proyecto → Settings → Environment Variables** (marcá Production, Preview y Development según corresponda; como mínimo Production).

| Variable | De dónde sale |
|---|---|
| `DATABASE_URL` | Paso 4 |
| `AUTH_SECRET` | Generar local: `openssl rand -base64 32` |
| `AUTH_URL` | `https://<PROD_URL>` (tu dominio final, sin barra al final) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Paso 3 |
| `TOKEN_ENCRYPTION_KEY` | Generar local: `openssl rand -hex 32` — cifra los tokens de GitHub en la DB, nunca la compartas ni la commitees |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Dashboard de Inngest → tu app → "Keys" (ver paso 6) |
| `GITHUB_WEBHOOK_SECRET` | Generar local: `openssl rand -hex 32` |
| `WEBHOOK_BASE_URL` | `https://<PROD_URL>` (sin barra final) — se usa para construir `.../api/webhooks/github` al registrar webhooks por repo |
| `ANTHROPIC_API_KEY` | Opcional — [console.anthropic.com](https://console.anthropic.com) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Opcional — dashboard de Resend; el "from" debe ser un dominio verificado en Resend |

No hace falta `E2E_BASE_URL` en Vercel — esa variable es solo para correr Playwright localmente/CI, nunca en runtime de producción.

---

## 6. Conectar Inngest a la app desplegada

1. En [app.inngest.com](https://app.inngest.com), creá una app (o usá el modo Cloud si ya tenés cuenta).
2. Copiá el **Event Key** y el **Signing Key** → cargalos como `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` en Vercel (paso 5) y hacé un **redeploy** (las env vars nuevas no aplican a un deploy ya corrido).
3. Una vez que el deploy con esas keys esté arriba, en el dashboard de Inngest agregá la app apuntando a:
   ```
   https://<PROD_URL>/api/inngest
   ```
4. Inngest hace un `PUT` a esa URL para descubrir las funciones registradas (`syncUserData`, `generateUserInsights`, `generateWrappedReport`, `reconcileAllUsers`, `autoGenerateClosedYearWrapped`, etc. — ver `app/api/inngest/route.ts`). Si el dashboard muestra las funciones listadas, quedó bien conectado.
5. Los dos crons (`reconcileAllUsers` a las 4am UTC, `autoGenerateClosedYearWrapped` a las 6am UTC) **no necesitan nada de Vercel** — corren solos desde Inngest apenas la app esté registrada. No hace falta (ni conviene) duplicarlos como Vercel Cron Jobs.

---

## 7. Migrar el schema a la base de producción

Desde tu máquina local, con `DATABASE_URL` apuntando a la base de **producción** (exportala en tu shell o usá un `.env.production.local` temporal, nunca commiteado):

```bash
npm install
npx prisma migrate deploy
```

`migrate deploy` (no `migrate dev`) es el comando correcto para producción: aplica las migraciones ya generadas sin pedir confirmación interactiva ni intentar generar una nueva.

---

## 8. Redeploy final y verificación

1. Con todas las env vars cargadas, disparar un **redeploy** en Vercel (Deployments → "..." → Redeploy), o simplemente hacer push a `main`.
2. Checklist post-deploy:
   - [ ] Entrar a `https://<PROD_URL>` y loguearse con GitHub — confirma que `AUTH_URL` y el OAuth App están bien configurados.
   - [ ] Disparar un sync manual desde `/dashboard` y ver que el panel de progreso avance (confirma que `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` funcionan).
   - [ ] En el dashboard de Inngest, ver la ejecución de `sync-user-data` completarse sin errores.
   - [ ] Generar un Wrapped desde `/wrapped` y confirmar que la imagen de Open Graph carga (`/wrapped/[year]/image`).
   - [ ] Si activaste `GITHUB_WEBHOOK_SECRET`/`WEBHOOK_BASE_URL`: hacer un commit en algún repo sincronizado y confirmar en GitHub (repo → Settings → Webhooks) que la entrega al endpoint devolvió `200`.

Si algo falla, revisá primero los logs de la función en Vercel (Deployments → tu deploy → Functions) y los logs de ejecución en el dashboard de Inngest — entre los dos cubren el 100% del pipeline (Vercel = requests HTTP; Inngest = todo lo async).

---

## 9. Dominio propio (opcional)

Si vas a usar un dominio propio en vez de `*.vercel.app`, hacelo **antes** de fijar `AUTH_URL`/`WEBHOOK_BASE_URL` definitivos y antes de registrar la callback URL en GitHub — cambiarlo después implica actualizar los tres lugares (Vercel env vars, GitHub OAuth App, y potencialmente re-registrar webhooks ya creados con la URL vieja).

Pasos: Vercel → Settings → Domains → agregar dominio → seguir las instrucciones de DNS que da Vercel (usualmente un registro `CNAME` o `A`).
