# GitHub Wrapped — Development Roadmap

> Ver `ROADMAP.md` para el análisis de producto completo (secciones 1-43).
> Este archivo trackea el plan técnico de implementación fase por fase.
> Convención: `[x]` fase completa y con tests, `[ ]` fase pendiente.

- [x] **Fase 0 — Foundation**
      Next.js 14 (App Router), Prisma schema inicial, Auth.js + GitHub
      OAuth, tokens cifrados en reposo, job queue con Inngest.
- [x] **Fase 1 — Insights Engine**
      Analytics Engine puro (sin red/DB) + capa de narración con IA
      opcional (fallback a plantillas deterministas sin `ANTHROPIC_API_KEY`).
- [x] **Fase 2 — Dashboard**
      Gráficos de heatmap, distribución de lenguajes y tendencia de
      commits, seleccionables por período.
- [x] **Fase 3 — Wrapped Experience**
      Slide deck full-screen con Framer Motion, orden narrativo
      persistido en `WrappedReport.slidesOrder`.
- [x] **Fase 4 — Sharing**
      Páginas públicas, Open Graph images (`next/og`), toggle de
      privacidad como acción consciente del dueño.
- [x] **Fase 5 — Gamificación & Comparaciones**
      Badges (`streak_7/30/100`, `polyglot_5`, `night_shift`,
      `century_club`, `marathon`), Developer Activity Score, comparaciones
      opt-in por ambas partes.
- [x] **Fase 6 — Repos privados (opt-in)**
      Reautorización incremental de OAuth, job de purga al desactivar.
- [x] **Fase 7 — Tiempo real y automatización**
      Webhooks (`push`/`repository`) verificados por HMAC, cron de
      reconciliación diario, auto-generación del Wrapped al cerrar el año.
- [x] **Fase 8 — Notificaciones**
      Email transaccional cuando el Wrapped anual está listo (solo en la
      primera generación de un año cerrado) y cuando se alcanza un
      milestone de racha (`streak_7/30/100`), con preferencias granulares
      por usuario y deduplicación por constraint de DB
      (`NotificationLog @@unique([userId, type, key])`). Envío vía Resend
      con fallback no-op documentado si no hay API key configurada.
- [x] **Fase 9 — i18n**
      `lib/i18n/`: resolución de locale por prioridad (cookie >
      `User.locale` > `Accept-Language` > default "es"), diccionarios
      `es`/`en` con paridad de claves forzada en compilación
      (`satisfies`) y en runtime (test dedicado), middleware Edge-safe
      que siembra la cookie en la primera visita sin pisar cambios
      explícitos. Cobertura completa de UI: landing, `<html lang>`,
      dashboard (7 componentes), Wrapped (7 slides + deck + CTA +
      compartir), comparaciones (2 páginas + 3 componentes), settings
      completo (notificaciones, idioma, repos privados con su diálogo de
      confirmación), catálogo de badges, emails de la Fase 8. Fuera de
      alcance a propósito y documentado: narrativas de insight ya
      persistidas (`insight.narrative`, generadas en español por
      `lib/insights/`), página `/score`, imágenes PNG de Open Graph.
- [x] **Fase 10 — Seguridad/Compliance**
      Auditoría de los 13 Route Handlers existentes (sin hallazgos de
      IDOR — ya verificaban sesión/ownership desde fases anteriores).
      Rate limiting propio (`lib/ratelimit/`, ventana fija atómica sobre
      Postgres, por usuario autenticado) en los 4 endpoints costosos:
      sync, generación de Wrapped, invitación a comparar, imagen OG.
      Exportación de datos (`DataExportRequest`, job de Inngest, excluye
      tokens de GitHub y métricas de terceros) y borrado de cuenta
      (transacción: limpia `AiUsageLog` sin FK + cascada completa vía
      `User`, requiere confirmación tipeada del username). UI en
      `/settings`.
- [x] **Fase 11 — Performance/Escalabilidad**
      Fan-out paginado por cursor en los dos crons de fan-out
      (`reconcile.ts`, `wrapped-auto-generate.ts`): el problema real no
      era memoria, era que cada `step.sendEvent` por usuario es un step
      durable de Inngest — decenas de miles de usuarios significaban
      decenas de miles de steps. Ahora cada página de 500 hace un solo
      `step.sendEvent` con el batch completo (`lib/jobs/fanout.ts`,
      `buildCursorPageArgs` testeado directamente). Se revisaron los
      demás loops del proyecto y se confirmó que son por-usuario
      (acotados), no fan-outs sobre toda la base — no necesitaban el
      mismo arreglo.
- [x] **Fase 12 — Testing E2E**
      Gap real cerrado (y verificado corriendo de verdad en este
      sandbox): `msw` estaba declarado como convención desde fases
      tempranas pero nunca se había usado — 7 tests de integración
      nuevos ejercen `lib/github/client.ts::withRetry` contra HTTP
      simulado real (403/429/500, headers `Retry-After` incluidos).
      Infraestructura completa de Playwright (`playwright.config.ts`,
      `e2e/`: seed determinístico + bypass de sesión de Auth.js sin
      pasar por OAuth real de GitHub) con 84 tests (21 specs × 4
      navegadores) cubriendo landing, dashboard, Wrapped, settings
      (i18n, notificaciones, export, borrado de cuenta), comparaciones y
      seguridad a nivel API (rate limiting, ownership, borrado real con
      usuario descartable). Escritos y validados sintácticamente
      (`playwright test --list`, `tsc`), pero sin poder ejecutarse
      contra un navegador real en este sandbox (descarga de binarios
      bloqueada por red — ver "Límites conocidos").
- [x] **Fase 13 — CI/CD**
      `.github/workflows/ci.yml`: 4 jobs (`typecheck`, `unit-tests`,
      `build`, `e2e`) — el job `e2e` levanta un Postgres de servicio
      efímero y el Inngest Dev Server local (`INNGEST_DEV=1`, mismo
      mecanismo que el flujo de desarrollo local) antes de correr los 84
      tests de Playwright de la Fase 12. Hallazgo importante: como
      `prisma generate` está bloqueado por red en este sandbox desde la
      Fase 0, `PrismaClient` fue tipado `any` durante las 13 fases
      anteriores — este pipeline, corriendo con acceso de red completo
      en GitHub Actions, es la primera vez que `tsc --noEmit` valida de
      verdad los usos de Prisma del proyecto contra su cliente generado.

---

## Notas de verificación (honestidad sobre lo no probado)

Cada fase documenta explícitamente qué no se pudo verificar en el
sandbox de desarrollo, en vez de marcarlo como completo sin más:

- **Fase 7**: registro de webhooks contra GitHub real, reconciliación
  contra infraestructura real de cron — no verificados end-to-end.
- **Fase 8**: envío real de emails vía Resend (solo probado el contrato
  HTTP con `fetch` mockeado), generación real del Prisma Client contra
  Postgres (bloqueada por descarga del binario del motor en este
  sandbox — mismo límite que en fases anteriores), renderizado visual
  del HTML del email en clientes de correo reales.
- **Fase 9**: `npm run build` no compiló end-to-end por un límite de red
  distinto (Google Fonts bloqueado, no relacionado con i18n) —
  `tsc --noEmit` y los 165 tests sí pasaron limpios. El middleware no se
  probó en un edge runtime real (se verificó por lectura que no importa
  `node:crypto`). El switcher de idioma no se probó en un navegador real.
- **Fase 10**: el upsert atómico de `RateLimitBucket` no se probó contra
  Postgres real (mismo bloqueo de `prisma generate`) — la lógica de
  decisión sí tiene cobertura completa de tests puros. El borrado de
  cuenta se testeó con Prisma mockeado, no contra una DB real con las
  cascadas de `onDelete: Cascade` disparándose de verdad.
- **Fase 11**: los dos crons paginados no se ejecutaron contra
  Postgres + Inngest reales con múltiples páginas — solo la lógica pura
  de paginación (`buildCursorPageArgs`, `isLastPage`) tiene tests
  directos. Verificado por lectura que ambos cursores usan un campo
  `@unique` (requisito de Prisma).
- **Fase 12**: los 84 tests de Playwright se escribieron y validaron
  sintácticamente (`playwright test --list`, `tsc`) pero nunca corrieron
  contra un navegador real (descarga de binarios bloqueada por red). Los
  7 tests de integración con `msw` sí corrieron de verdad — cierran un
  gap real: la convención de usar `msw` estaba declarada desde fases
  tempranas pero nunca se había implementado hasta ahora.
- **Fase 13**: `.github/workflows/ci.yml` nunca corrió en GitHub Actions
  real (plataforma no disponible en este sandbox) — se validó su
  sintaxis YAML y estructura de jobs programáticamente. Ver el
  razonamiento completo en README.md, Fase 13: como consecuencia directa
  de que `prisma generate` esté bloqueado en este sandbox desde la Fase
  0, este pipeline es también la primera vez que el `tsc --noEmit` de
  todo el proyecto corre contra el cliente de Prisma REALMENTE generado
  — cualquier error de tipos ahí sería nuevo, no una regresión de esta
  fase.
- **Todas las fases**: 60fps de las animaciones de Framer Motion en
  dispositivos móviles reales, previews de Open Graph en plataformas
  sociales reales.

## Auditoría externa (post-Fase 13) — correcciones aplicadas

Se realizó una auditoría técnica completa del código (ver
`auditoria-github-wrapped.md` entregado junto a esta fase). Se
corrigieron los hallazgos P0/P1 confirmados en el código:

- [x] **Hallazgo 1 (🔴 crítico) — atribución incorrecta de commits en
  repos compartidos/org**: `lib/github/commits.ts` verificaba
  `Boolean(commit.author?.login)` para decidir si un commit era del
  usuario, pero ese campo es el login al que GITHUB vinculó el commit —
  el de CUALQUIER colaborador del repo, no necesariamente el del usuario
  analizado. Como `lib/jobs/sync.ts` sincroniza repos con
  `affiliation: "owner,collaborator,organization_member"` (no solo
  repos propios), esto atribuía al usuario commits de sus compañeros de
  equipo/organización en cualquier repo compartido. Corregido comparando
  contra el `login` real del usuario autenticado (`currentUserLogin`,
  case-insensitive), manteniendo el fallback por email verificado para
  el caso legítimo de un commit no auto-vinculado. Cubierto por 4 tests
  de integración nuevos con `msw`
  (`lib/github/__tests__/commits.integration.test.ts`), incluyendo el
  caso explícito de "commit de un colega no debe contarse".
- [x] **Hallazgo 2 (🟠 alto) — sin headers de seguridad HTTP**: se
  agregó `headers()` en `next.config.mjs` (CSP, `X-Frame-Options: DENY`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`)
  para todas las rutas excepto `/api/*` (que reciben requests de
  terceros — Inngest, webhooks de GitHub — que no deben chocar con un
  CSP pensado para HTML). Prioritario por las páginas públicas
  compartibles (`/[username]/wrapped/[year]`), pensadas para ser vistas
  por terceros vía link.
- [x] **Hallazgo 3 (🟡 medio) — firma de Inngest**: verificado que
  `serve()` de `inngest/next` lee `INNGEST_SIGNING_KEY` automáticamente
  del entorno (ya documentado en `.env.example`); no requería cambio de
  código, solo se confirma y se deja documentado acá para que quede
  cerrado, no abierto como duda.
- [ ] Hallazgo "forks/repos archivados no excluidos explícitamente"
  (🟡 P1 en la auditoría): tras corregir el Hallazgo 1, se reevaluó y se
  decidió NO agregar un filtro adicional todavía — con la atribución de
  identidad ya corregida, un fork sin commits propios del usuario nunca
  puede ganar "repo más activo" (no tiene commits atribuidos), y excluir
  repos archivados por completo eliminaría actividad histórica legítima
  de un Wrapped de años anteriores. Se deja abierto para revisar solo si
  aparece evidencia real de que sigue siendo un problema (evitar
  sobreingeniería sobre una hipótesis ya debilitada por la otra
  corrección).
- Pendientes de la auditoría, no bloqueantes para esta entrega: caché
  HTTP en rutas de analytics (🟡 P2, requiere decidir TTL sin chocar con
  sync en tiempo real) y tracking proactivo del presupuesto de puntos de
  GraphQL (🟡 P2).

`npx vitest run`: 204/204 tests pasan (incluyendo los 4 nuevos).
`tsc --noEmit`: limpio. `prisma generate` sigue bloqueado por red en
este sandbox (mismo límite documentado desde la Fase 0) — no afecta a
los cambios de esta corrección, que no tocan el schema.

## Reorganización de rutas + despliegue a Vercel

- [x] **Endpoints sin prefijo `/api/`**: se movieron todos los Route
  Handlers a la raíz (`/account`, `/analytics`, `/badges`,
  `/comparisons`, `/comparisons/[id]`, `/insights`, `/settings/locale`,
  `/settings/notifications`, `/settings/private-repos`, `/sync`,
  `/wrapped`, `/wrapped/[year]/image`) y se actualizaron todos los
  `fetch(...)` del frontend, los comentarios que los referenciaban, y
  los tests E2E de Playwright que esperan esas URLs.
- [x] **Tres rutas se mantuvieron deliberadamente bajo `/api/`**:
  `/api/auth/*` (convención hardcodeada de Auth.js — moverla requiere
  `basePath` + reconfigurar la callback URL en GitHub), `/api/inngest`
  (URL configurada externamente en el dashboard de Inngest) y
  `/api/webhooks/github` (URL ya registrada por este mismo proyecto en
  cada repo vía `registerRepoWebhookBestEffort` — cambiarla deja
  huérfanos los webhooks ya creados en producción). Ver la explicación
  completa en `DEPLOYMENT.md`, sección 0.
- [x] Se verificó que ningún endpoint movido colisiona con una página
  existente (`page.tsx`) en el mismo segmento exacto — Next.js solo
  prohíbe `route.ts` y `page.tsx` en la misma carpeta, y no hay ningún
  caso así en este proyecto (ej. `/wrapped/route.ts` convive sin
  problema con `/wrapped/[year]/page.tsx`, son segmentos distintos).
- [x] `package.json`: se agregó `"postinstall": "prisma generate"` —
  sin esto, el build de Vercel fallaría por no tener `@prisma/client`
  generado (Vercel no corre `prisma generate` automáticamente, solo
  `npm install` y después el build command).
- [x] `vercel.json`: config mínima (framework, build/install command).
  A propósito NO incluye un bloque `crons`: los dos jobs recurrentes del
  proyecto (`reconcileAllUsers`, `autoGenerateClosedYearWrapped`) son
  crons nativos de Inngest, no de Vercel — duplicarlos como Vercel Cron
  además de Inngest los ejecutaría dos veces.
- [x] `DEPLOYMENT.md`: guía paso a paso para configurar cuentas externas
  (GitHub OAuth App, Postgres administrado, Inngest, opcionalmente
  Resend/Anthropic), cargar variables de entorno en Vercel, migrar el
  schema a producción (`prisma migrate deploy`, no `migrate dev`), y un
  checklist de verificación post-deploy.

No verificable en este sandbox (sin red hacia Vercel/GitHub/Inngest
reales): el resultado real de un deploy en Vercel, el flujo de OAuth
completo contra una GitHub OAuth App real, y la conexión real de
Inngest Cloud a `/api/inngest`. `npx vitest run` (204/204) y
`tsc --noEmit` (limpio) sí corrieron de verdad después de mover las
rutas.
