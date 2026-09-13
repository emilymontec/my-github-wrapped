# GitHub Wrapped — v0.1 Foundation + v0.2 GitHub Integration

Este scaffold implementa las primeras dos fases del roadmap (`ROADMAP.md`,
secciones 36 y 38), con todas las correcciones ⚠️ ya aplicadas:

## v0.1 — Foundation ✅
- Proyecto Next.js 14 (App Router) + TypeScript + Tailwind.
- `prisma/schema.prisma`: incluye los modelos estándar de Auth.js
  (`Account`, `Session`, `VerificationToken`), `User.timezone`,
  `GitHubAccount` con campos completos, `Commit.authorEmail`,
  `LanguageStat` como serie de tiempo (`capturedAt`), y `SyncState` para
  soportar el polling de progreso (sección 32).
- GitHub OAuth vía Auth.js (`lib/auth/index.ts`), con scope mínimo
  (`read:user user:email public_repo` — **sin** acceso a repos privados,
  ver sección 5). Tokens cifrados con AES-256-GCM antes de persistirse
  (`lib/auth/crypto.ts`) — nunca en texto plano.
- UI básica: landing con "Connect GitHub" y dashboard protegido por
  middleware.

## v0.2 — GitHub Integration ✅
- Cliente REST (`lib/github/client.ts`) con **retry + backoff exponencial**
  ante 403/429 (`withRetry`).
- Cliente GraphQL (`lib/github/graphql.ts`) exclusivamente para el
  **contribution calendar**, que no existe en REST (sección 6).
- Collectors: `repositories.ts` (filtra privados — alcance MVP),
  `commits.ts` (resuelve identidad del autor contra emails verificados,
  no solo `author.login`), `languages.ts` (snapshot con bytes/porcentaje).
- **Job queue con Inngest** (`lib/jobs/`): la sincronización pesada corre
  fuera del ciclo de vida de una request HTTP. `app/sync/route.ts`
  **solo encola** el evento — nunca hace el trabajo directamente (sección
  32, corrección crítica sobre límites de timeout serverless en Vercel).
- El dashboard hace polling de `/api/sync` (GET) para mostrar el progreso
  ("Analyzing your GitHub... 78%").

## v0.3 — Analytics ✅
- `lib/analytics/`: motor puro, sin dependencias de GitHub API, DB ni UI
  (sección 13) — recibe arrays en memoria y devuelve métricas.
- `timezone.ts`: único punto de conversión UTC → hora local, usando
  `Intl.DateTimeFormat` (sin dependencias extra). Todo lo demás depende de
  este módulo en vez de leer `Date` directamente (corrección sección 14.4).
- `commits.ts` / `repositories.ts` / `languages.ts`: estadísticas de las
  secciones 14.1-14.3. `languages.ts` toma el snapshot más reciente por
  repo+lenguaje, ya que `LanguageStat` es una serie de tiempo.
- `activity.ts`: distribución por hora/día, hora y día más activos,
  actividad nocturna/fin de semana — todo timezone-normalizado (14.4/14.5).
- `streaks.ts`: rachas (sección 15) calculadas sobre la fecha local, no UTC.
- `engine.ts` (`runAnalytics`): compone todo lo anterior. Expuesto en
  `app/analytics` (route handler delgado: solo trae datos de Prisma y
  delega el cálculo al engine).
- `lib/analytics/__tests__/`: 22 tests con Vitest, incluyendo casos
  explícitos con usuarios en distintas timezones (mejora sugerida en
  sección 28) — corren con `npm test`.

## Fase 1 — Insights Engine ✅
- `lib/insights/rules.ts`: 10 reglas de detección puras (`night_owl`,
  `early_bird`, `weekend_warrior`, `consistent_committer`,
  `language_loyalist`, `polyglot`, `mono_repo_focus`, `serial_starter`,
  `longest_streak`, `active_streak`), cada una con umbral de tamaño de
  muestra mínimo y **cero** cálculo propio — solo leen lo que ya calculó
  el Analytics Engine.
- `rank.ts`: ordena por prioridad y resuelve pares mutuamente excluyentes
  (`night_owl` vs `early_bird`, `language_loyalist` vs `polyglot`,
  `mono_repo_focus` vs `serial_starter`).
- `templates.ts`: plantillas deterministas en español — fallback
  obligatorio cuando la IA está desactivada, falla, o el texto generado no
  pasa moderación básica.
- `narrate.ts`: única capa que llama a la IA (Claude Haiku 4.5), y
  **solo** para redactar sobre datos ya calculados — nunca para calcular
  estadísticas (pipeline `datos → Analytics Engine → métricas → Insights
  Engine → lenguaje natural`, no al revés). Loguea costo/uso en
  `AiUsageLog` en cada llamada, exitosa o no.
- `engine.ts` (`generateInsights`): compone detección → ranking →
  narración.
- Job de Inngest (`lib/jobs/insights.ts`) separado de la sincronización:
  se dispara por evento al terminar `sync-user-data`, y un fallo ahí
  **nunca** marca la sincronización de datos como fallida.
- `app/insights` — route handler delgado, solo lee lo ya persistido.
- 38 tests nuevos (60 en total con los de Fase 0): reglas de detección
  con casos límite, ranking y exclusión mutua, plantillas, narración con
  IA/fetch/Prisma mockeados (nunca toca red ni DB real), y un test
  end-to-end del pipeline completo con IA desactivada.

## Fase 2 — Dashboard ✅
- Extendido el Analytics Engine con `buildDailyDistribution` (día por día
  del período, timezone-normalizado) — necesario para el heatmap; nunca
  se calculó en un componente de UI (regla explícita de la Fase 2).
- `lib/dashboard/period.ts`: resuelve los 3 períodos del selector
  (últimos 30 días / año calendario / rolling 12 meses). Trunca a
  medianoche UTC a propósito — es lo que permite que el job de insights
  (que corre en background con latencia variable) y el Route Handler que
  los sirve calculen exactamente el mismo rango sin depender de que
  ambos corran en el mismo instante.
- `lib/analytics/service.ts` / `lib/insights/service.ts`: capa
  compartida entre el Server Component del dashboard (render inicial) y
  los Route Handlers (`/api/analytics?period=...`, `/api/insights`) — un
  solo lugar arma la consulta a Prisma para cada período.
- Componentes en `components/dashboard/`: `ActivityHeatmap` (estilo
  contribution graph), `LanguageChart` y `CommitTrend` (Recharts),
  `StreakCard`, `InsightsGrid`, `PeriodSelector`, `EmptyState`,
  `Skeleton`. Todos reciben datos ya calculados por props — ninguno
  agrega o promedia nada por su cuenta.
- Tipografía dedicada (Space Grotesk + Manrope vía `next/font/google`) y
  paleta de heatmap alineada a la convención visual de GitHub.
- **Corrección real encontrada durante el build:** `middleware.ts`
  reexportaba `auth()` para proteger `/dashboard`, pero esa función usa
  `node:crypto` (cifrado de tokens) y sesiones de base de datos vía
  Prisma — ninguno de los dos corre en el Edge Runtime, donde Next.js
  ejecuta middleware por defecto. `npm run build` lo detectó
  (`UnhandledSchemeError` en `node:crypto`). Se eliminó `middleware.ts`;
  la protección de ruta ya vivía también en el propio Server Component
  de `app/dashboard/page.tsx`, que sí corre en Node.js.
- 7 tests nuevos para `resolvePeriod` (70 en total en el proyecto).

## Fase 3 — Wrapped Experience ✅
- **Corrección real encontrada antes de construir esto:** `resolvePeriod`
  (Fase 2) truncaba `end` a la medianoche de *hoy*, lo que excluía en
  silencio todos los commits del día actual de cualquier consulta por
  período. Se corrigió: `end` ahora es un límite **exclusivo** explícito
  (medianoche del día siguiente), documentado en el tipo compartido
  `AnalyticsPeriod`, con todos los `lte` cambiados a `lt` en los
  consumidores y `buildDailyDistribution` ajustado para no generar un día
  de más según la timezone. Tests actualizados para cubrir explícitamente
  el caso que antes fallaba.
- `lib/wrapped/period.ts`: `resolveYearPeriod(year)` distingue años
  **cerrados** (año < actual — su Wrapped, una vez generado, no se vuelve
  a regenerar nunca) de el año **en curso** (regenerable bajo demanda,
  con throttle de 15 minutos vía `isStale`).
- `lib/wrapped/slides.ts`: `buildWrappedSlides` — función pura que arma
  los 7 slides en el orden narrativo fijo (apertura → volumen → ritmo →
  lenguajes → repos → racha → cierre) a partir de `AnalyticsResult` +
  `Insight[]` ya persistidos. Nunca recalcula nada; solo selecciona el
  insight de mayor prioridad que aplica a cada slide.
- `lib/wrapped/service.ts`: recalcula `AnalyticsResult` en cada visita
  (barato, determinista, sin IA) pero lee los insights y la existencia
  del reporte tal cual están en DB — la regla de "nunca recalcular"
  aplica a lo que cuesta dinero (IA) y a la identidad del reporte, no a
  los números en sí.
- `lib/jobs/wrapped.ts`: job de Inngest que genera el reporte, reutilizando
  `getAnalyticsForPeriod` y `generateAndPersistInsights` (extraídos de
  `lib/jobs/insights.ts` en este mismo trabajo, para no duplicar la
  lógica entre el job del dashboard y el de Wrapped).
- `app/wrapped/route.ts`: POST solo encola (nunca genera inline);
  rechaza con 409 la regeneración de años cerrados y no encola si el año
  en curso ya tiene un reporte reciente. GET hace polling liviano de
  disponibilidad.
- `app/wrapped/[year]/page.tsx`: Server Component — arma el CTA de
  generación si no existe reporte, o renderiza `<WrappedSlideDeck>` si
  existe.
- `components/wrapped/`: `WrappedSlideDeck` (navegación por teclado,
  tap-zones estilo stories, swipe táctil, autoplay opcional, transiciones
  con Framer Motion) + `SlideRenderer` (switch exhaustivo — un slide sin
  handler es error de compilación, no una pantalla en blanco) + 7
  componentes de slide individuales.
- 11 tests nuevos (82 en total en el proyecto).

## Fase 4 — Sharing ✅
- `lib/wrapped/service.ts` extendido con `getPublicWrappedPageData` y
  `getPublicWrappedSummary` — auditados explícitamente en comentarios
  sobre qué se expone sin sesión: nunca email, nunca tokens, nunca el
  `User.name` completo (se usa el `username`/login de GitHub, ya público
  en GitHub). Si el reporte no existe O es privado, ambos casos devuelven
  el mismo resultado (`null` → 404 genérico) para no filtrar si un
  usuario generó un Wrapped que decidió no compartir.
- `app/[username]/wrapped/[year]/page.tsx`: página 100% pública, sin
  `auth()`. Documentada la limitación conocida de que un username
  literalmente igual a `api`/`dashboard`/`wrapped` no sería alcanzable
  (colisión con rutas estáticas de la propia app).
- `app/[username]/wrapped/[year]/opengraph-image.tsx`: usa la convención
  de archivo de Next.js — genera la imagen y las etiquetas
  `og:image`/`twitter:image` automáticamente, sin escribir meta tags a
  mano. Usa el resumen liviano (campos denormalizados de
  `WrappedReport`), no el Analytics Engine completo, porque a esta ruta
  la golpean crawlers, no personas.
- `app/wrapped/[year]/image/route.tsx`: export de imagen en 3
  formatos (story 9:16, post 1:1, twitter 16:9) vía `next/og`
  (`ImageResponse`/Satori) — nunca screenshot de DOM. Autenticado y con
  alcance solo al propio usuario (no recibe `userId` en la URL).
- `PATCH /api/wrapped`: único punto que puede activar `isPublic` —
  siempre requiere sesión, siempre opera sobre `session.user.id`, nunca
  sobre un `userId` del body.
- `components/wrapped/ShareControls.tsx`: panel de compartir (toggle de
  privacidad, copiar link, Web Share API, selector de formato + descarga
  de imagen) — solo se monta si `mode === "private"` en `WrappedSlideDeck`,
  que ahora sirve tanto la vista del dueño como la pública con el mismo
  componente.
- 5 tests nuevos para la lógica pura de contenido de imagen exportada (87
  en total en el proyecto).

## Fase 5 — Gamificación & Comparaciones ✅
- `lib/gamification/badges.ts`: 7 badges detectados sobre el mismo
  `AnalyticsResult` que ya usa el Insights Engine — "no inventar un
  sistema paralelo de reglas" (sección 42). Semántica "earned once, kept
  forever": `lib/gamification/persist.ts` solo CREA badges nuevos, nunca
  actualiza ni revoca uno existente (diff explícito contra lo ya
  otorgado, no un upsert con `update: {}`, para poder saber con certeza
  cuáles son genuinamente nuevos en cada corrida).
- `lib/analytics/score.ts`: Developer Activity Score — nunca
  "Productivity Score". Fórmula simple y transparente (4 dimensiones,
  cada una con un cap lineal documentado, pesos fijos que suman 1),
  versionada (`SCORE_VERSION`). Documentada en una página pública
  (`app/score`) que lee las constantes reales del código, no una
  aproximación redactada aparte.
- Badges y score se otorgan/calculan en el mismo job que ya corría los
  insights (`lib/jobs/insights.ts`) — sin costo de IA de por medio, así
  que no hizo falta un evento separado como sí pasa con Wrapped.
- `lib/comparisons/service.ts`: flujo de invitación opt-in completo —
  crear invitación (`PENDING`), solo el destinatario puede aceptar,
  cualquiera de las dos partes puede revocar en cualquier momento
  (antes o después de aceptar). `getAcceptedComparison` es la única
  función que devuelve datos comparativos, y solo si el que pregunta es
  uno de los dos participantes de un vínculo `ACCEPTED` — mismo 404
  genérico que la página pública de Wrapped si no se cumple.
- `app/compare/` — lista de comparaciones + invitación (`app/compare`) y
  la vista de comparación en sí (`app/compare/[id]`), calculada sobre el
  período canónico "rolling12" de cada usuario. Sin lenguaje de
  "ganador/perdedor" — solo énfasis visual leve en el valor más alto.
- 20 tests nuevos (107 en total en el proyecto): umbrales de badges
  (casos límite en cada threshold) y la fórmula del score (suma de pesos,
  rango [0,100] garantizado, división por cero en `periodDays`).

## Fase 6 — Repos privados (opt-in) ✅
- **Corrección real de arquitectura:** el token de GitHub se persistía
  solo en el evento `linkAccount` de Auth.js, que se dispara **una sola
  vez** (la primera vez que se vincula la cuenta). El flujo de
  reautorización incremental de esta fase (pedir el scope `repo` más
  adelante) pasa de nuevo por sign-in, no por link-account — así que un
  usuario que ya tenía la cuenta conectada nunca habría visto su token
  actualizado con el scope ampliado. Se movió esa lógica al evento
  `signIn` (se dispara en cada inicio de sesión, no solo el primero).
- `GITHUB_SCOPES_WITH_PRIVATE_REPOS` (`lib/auth/index.ts`): scope
  ampliado, solicitado únicamente desde `/settings` vía el tercer
  argumento de `signIn()` de Auth.js v5 (`authorizationParams`) — el
  mecanismo soportado oficialmente para autorización incremental, sin
  pasar por fuera de la protección CSRF/PKCE que ya arma Auth.js.
- `lib/github/repositories.ts`: `getRepositories` ahora acepta
  `includePrivate` (default `false`, preserva el comportamiento MVP).
  `lib/jobs/sync.ts` lo activa solo si **ambas** condiciones se cumplen:
  el flag `User.privateReposEnabled` Y que el token realmente tenga el
  scope `repo` otorgado — defensa en profundidad, no confía en una sola
  señal.
- `lib/jobs/purge-private-repos.ts`: al desactivar, borra
  `Commit`/`LanguageStat`/`Repository` de los repos privados, **y
  también** todo `Insight`/`WrappedReport`/`Badge` del usuario — esos
  datos derivados pueden seguir codificando señal de actividad privada
  aunque los commits crudos ya no estén. Es la única excepción explícita
  a "un año cerrado nunca se regenera": la purga de privacidad tiene
  prioridad sobre esa regla.
- `app/settings`: copy revisado para ser inequívoco sobre qué se lee (
  nombres/commits/lenguajes) y qué no (nunca el contenido del código,
  nunca se hace público sin un paso de consentimiento aparte). Toggle con
  confirmación explícita en ambas direcciones — activar y desactivar.
- Activar/desactivar después de la conexión inicial es solo el flag +
  jobs — no requiere reconectar la cuenta ni volver a autorizar en
  GitHub.

## Fase 7 — Tiempo real y automatización ✅
- `lib/webhooks/verify.ts`: verificación HMAC-SHA256 en tiempo constante
  del header `X-Hub-Signature-256` — sobre el body **raw**, nunca sobre
  JSON re-serializado (una diferencia de espaciado rompe la firma aunque
  el contenido sea "el mismo"). `app/api/webhooks/github/route.ts` lee
  `request.text()` antes de tocar cualquier otra cosa.
- `lib/webhooks/parse.ts`: parseo puro de payloads `push`/`repository`.
  Los commits de un push traen mensaje/autor/timestamp **en el propio
  payload** — no hace falta otra llamada a la API de GitHub para esa
  metadata básica, es lo que hace liviana la actualización disparada por
  webhook.
- `lib/jobs/webhook-push.ts`: acotado a un solo repo (no es una sync
  completa), resuelve identidad contra emails verificados (mismo
  principio que el collector REST), refresca lenguajes, y dispara
  regeneración de insights — un push real se refleja sin esperar al
  próximo sync manual o al cron.
- `lib/jobs/reconcile.ts` (cron diario) y `lib/jobs/wrapped-auto-generate.ts`
  (cron diario, revisa si ya cerró un año): los webhooks son un canal
  adicional, nunca el único — estos cubren el caso "el webhook se
  perdió" sin que el usuario lo note.
- `lib/github/webhooks.ts`: registro de webhooks **best-effort** — el
  scope base (`public_repo`) no incluye `admin:repo_hook`, así que un
  fallo de permiso se absorbe en silencio y el cron de reconciliación
  cubre ese repo igual. Documentado explícitamente por qué NO se pidió
  un scope incremental más como parche: el roadmap señala que la
  solución de fondo (si esto se vuelve necesario) es migrar a GitHub
  App, no acumular scopes de OAuth App.
- 14 tests nuevos (121 en total en el proyecto).

## Fase 8 — Notificaciones ✅
- `prisma/schema.prisma`: `NotificationPreference` (un booleano por tipo
  de notificación, default `true` — a diferencia de repos privados, esto
  no amplía qué datos se leen de GitHub, es un aviso sobre contenido del
  propio usuario) y `NotificationLog` (`@@unique([userId, type, key])`)
  para deduplicar envíos.
- `lib/notifications/email.ts`: envío vía la API REST de Resend con
  `fetch` puro, mismo patrón que `lib/insights/narrate.ts` con Anthropic
  — sin `RESEND_API_KEY`/`RESEND_FROM_EMAIL` configuradas, cae a un
  no-op documentado en vez de romper el job que lo dispara. Un email que
  no se pudo mandar nunca convierte un Wrapped generado o un badge
  otorgado en un job fallido.
- `lib/notifications/service.ts`: deduplicación por **constraint de DB**,
  no por "check-then-write" — intenta el `create` en `NotificationLog`
  primero y captura el código de error P2002, así que dos ejecuciones
  concurrentes (el cron de reconciliación reintentando, un evento de
  Inngest reintentado) nunca pueden pasar ambas el check antes de que
  cualquiera escriba.
- `lib/jobs/wrapped.ts`: dispara `notifications/wrapped-ready.requested`
  únicamente la primera vez que un año **cerrado** se genera — nunca en
  una regeneración del año en curso (que pasa cada vez que el usuario
  abre su propio Wrapped todavía abierto).
- `lib/jobs/insights.ts`: dispara `notifications/streak-milestone.requested`
  para badges `streak_7`/`streak_30`/`streak_100` recién otorgados
  (`awardEligibleBadges` ahora devuelve `{type, metadata}[]`, no solo el
  tipo, para poder armar el email sin releer el badge de la DB).
- `/settings`: sección nueva con toggles granulares por tipo de
  notificación (`app/settings/notifications/route.ts` +
  `components/settings/NotificationPreferencesToggles.tsx`) — a
  diferencia del toggle de repos privados, sin paso de confirmación:
  prender/apagar un aviso por email es reversible y no borra datos.
- 22 tests nuevos (143 en total en el proyecto).

## Fase 9 — i18n ✅
- `prisma/schema.prisma`: `User.locale String @default("es")` — closed
  set en código (`lib/i18n/locales.ts`), no enum de Prisma, misma
  convención que `Badge.type`/`Insight.type`.
- `lib/i18n/`: `resolve.ts` (lógica pura y testeada:
  `parseAcceptLanguage` + `resolveLocale`, sin dependencias de
  Next.js/DB), `dictionary.ts` (`getDictionary` + interpolación `t()`),
  `dictionaries/{es,en}.ts` (`en.ts` usa `satisfies Dictionary`, no
  `as`, para forzar paridad exacta de claves en tiempo de compilación —
  reforzado además por un test de paridad en runtime), `server.ts`
  (`getRequestLocale`/`getRequestDictionary`, server-only).
- **Prioridad de resolución** (documentada en el schema): cookie
  `NEXT_LOCALE` > `User.locale` > header `Accept-Language` > default
  `"es"`. `middleware.ts` (Edge Runtime, sin `node:crypto` — la lección
  de la Fase 0) solo siembra la cookie en la primera visita, nunca pisa
  una ya existente.
- `/settings`: switcher de idioma nuevo (`/api/settings/locale`,
  `components/settings/LanguageToggle.tsx`) — funciona para visitantes
  anónimos (solo cookie) y logueados (cookie + `User.locale`, para que
  la preferencia viaje entre dispositivos).
- **Alcance parcial a propósito, cerrado en una segunda pasada dentro de
  la misma Fase 9**: se completó la cobertura a dashboard (7
  componentes), Wrapped (7 slides + deck + CTA + compartir), comparaciones
  (2 páginas + 3 componentes) y la sección de repos privados de
  `/settings` (incluido su diálogo de confirmación, el punto de mayor
  sensibilidad de privacidad del producto — ver Fase 6). De paso se
  corrigió una inconsistencia preexistente en `sync-panel.tsx` (mezcla
  de inglés/español en el copy original) y una duplicación de copy entre
  `NotificationPreferencesToggles` y el diccionario.
- **Sigue fuera de alcance a propósito, documentado explícitamente en el
  código**: la narrativa de cada insight (`insight.narrative`) sale ya
  redactada de `lib/insights/` (IA o plantillas) y persistida en
  español al momento del sync — traducirla requeriría regenerarla o
  agregar una capa de traducción aparte, no es solo copy de UI. También
  quedan afuera la página `/score` (texto explicativo largo, baja
  prioridad) y las imágenes PNG de Open Graph/compartir (texto
  renderizado a píxeles, no HTML).
- 22 tests nuevos (165 en total en el proyecto).

## Fase 10 — Seguridad/Compliance ✅
- **Auditoría de permisos**: revisión de los 13 Route Handlers
  existentes. Conclusión: ya verificaban sesión y ownership
  correctamente desde fases anteriores (sin hallazgos de IDOR) — los dos
  gaps reales eran rate limiting y GDPR, cerrados en esta fase.
- `lib/ratelimit/`: rate limiting propio de la aplicación, deliberadamente
  independiente del rate limit de la API de GitHub que ya maneja el Data
  Collector (protege NUESTRO costo/capacidad — jobs de Inngest, tokens de
  Anthropic, `ImageResponse` — no el acceso a GitHub). Ventana fija
  respaldada por Postgres con un upsert atómico
  (`RateLimitBucket`, `$queryRawUnsafe` en vez de `Prisma.sql` — ese
  tagged template no existe en el stub de tipos sin generar, mismo
  límite de sandbox documentado desde la Fase 8). Aplicado por usuario
  autenticado (nunca por IP) a `POST /api/sync`, `POST /api/wrapped`,
  `POST /api/comparisons` y `GET /api/wrapped/[year]/image`.
- **Exportación de datos**: `DataExportRequest` + `lib/account/export.ts`
  + `lib/jobs/account-export.ts` (job de Inngest — nunca corre inline,
  mismo principio que sync/Wrapped: puede leer decenas de miles de
  commits). Excluye explícitamente tokens de GitHub (nunca una segunda
  copia sin cifrar de credenciales vivas) y las métricas del otro
  participante en una comparación (solo su username). Descarga vía
  `GET /api/account/export/[id]/download`, ownership-checked.
- **Borrado de cuenta**: `lib/account/delete.ts` — a diferencia del
  export, corre inline (un `DELETE` con cascada de FKs no es trabajo
  pesado de lectura). Limpia `AiUsageLog` explícitamente primero (es la
  única tabla con `userId` sin relación declarada) y borra el `User`
  en la misma transacción; el resto cae por `onDelete: Cascade`.
  `DELETE /api/account` exige `confirmUsername` verificado contra el
  username real — un DELETE vacío nunca borra nada.
- `/settings`: dos secciones nuevas, `DataExportPanel` (con polling,
  mismo patrón que `sync-panel.tsx`) y `AccountDangerZone` (confirmación
  de dos pasos + tipear el username exacto, botón deshabilitado hasta
  que coincida).
- 21 tests nuevos (186 en total en el proyecto).

## Fase 11 — Performance/Escalabilidad ✅
- **El problema real no era memoria, era cantidad de steps**: ambos crons
  (`reconcile.ts`, `wrapped-auto-generate.ts`) hacían un `step.sendEvent`
  por usuario dentro de un `for` — cada `step.sendEvent` es un step
  durable de Inngest, así que una base de decenas de miles de usuarios
  significaba decenas de miles de steps en una sola ejecución.
- `lib/jobs/fanout.ts`: paginación por cursor (`buildCursorPageArgs`,
  testeado directamente — el bug clásico de esta técnica es olvidar
  `skip: 1` y duplicar/loopear infinito) + `FANOUT_PAGE_SIZE = 500`.
  Cada página hace UN `step.run` (leer) + UN `step.sendEvent` con el
  **batch completo de esa página** (no un evento por usuario) — para N
  usuarios, ahora son `~2 × (N / 500)` steps en vez de `N + 1`.
- Se revisaron los demás loops del proyecto (`sync.ts`, `webhook-push.ts`,
  `insights.ts`) para confirmar que son loops **por-usuario** (acotados a
  la actividad de una sola persona en GitHub — repos, commits, badges),
  no fan-outs sobre toda la base de usuarios — no necesitaban el mismo
  arreglo.
- La idempotencia ya existente de `lib/jobs/wrapped.ts` (nunca regenera
  un año cerrado) y `lib/jobs/sync.ts` sigue siendo lo que hace seguro
  reintentar sin duplicar trabajo — paginar el fan-out no cambia esa
  garantía, solo cambia cuántos steps hacen falta para dispararlo.
- 7 tests nuevos (193 en total en el proyecto).

## Fase 12 — Testing E2E ✅
- **Gap real encontrado y cerrado, no relacionado con Playwright**: el
  proyecto declaró desde fases tempranas la convención "Tests de
  integración con mocking de HTTP (msw) — nunca contra la API real de
  GitHub en CI" (ver ROADMAP.md), y `msw` estaba en `package.json` desde
  entonces, pero **nunca se usó** — ningún test ejercía `withRetry`
  (`lib/github/client.ts`) contra HTTP simulado de verdad. Se agregó
  `lib/github/__tests__/client.integration.test.ts`: 7 tests con
  `msw/node` que hacen que Octokit reciba 403/429/500 reales (headers
  incluidos, como `Retry-After`) y verifican el comportamiento
  observable de principio a fin — reintento, backoff exponencial,
  respeto de `Retry-After`, y que NO reintenta ante errores que no son
  403/429. Esto SÍ corre y se verificó en este sandbox (no necesita
  browser ni Postgres).
- **Infraestructura de Playwright** (`playwright.config.ts`, `e2e/`):
  - `e2e/seed.ts` + `global-setup.ts`/`global-teardown.ts`: siembra un
    usuario de test determinístico (repos, commits, lenguajes, un
    `WrappedReport` de un año ya cerrado, badges) directamente vía
    Prisma, y arma el `storageState` de Playwright con la cookie de
    sesión de Auth.js ya puesta — bypass deliberado del flujo real de
    OAuth de GitHub (infraestructura de un tercero, no código de este
    proyecto) para que los specs empiecen ya logueados.
  - 6 archivos de specs, 21 tests × 4 proyectos de navegador (chromium,
    firefox, webkit, mobile-chrome) = 84 tests: `landing.spec.ts`
    (incluye `Accept-Language` → locale, redirect real a
    `github.com/login/oauth/authorize` sin completarlo),
    `dashboard.spec.ts`, `wrapped.spec.ts` (navegación de slides,
    compartir público/privado), `settings.spec.ts` (idioma persistido
    por cookie tras reload, notificaciones, export, gating de
    confirmación de borrado de cuenta), `comparisons.spec.ts`, y
    `security.spec.ts` — a nivel API (`request`, sin browser), prueba
    contra el servidor real el 429 de rate limiting de la Fase 10, que
    el export de otro usuario da 404 con el ID exacto, y el flujo
    completo de borrado de cuenta con un usuario 100% descartable.
- **Verificado en este sandbox**: `tsc --noEmit` limpio sobre todo
  `e2e/`, y `npx playwright test --list` descubre y parsea los 84 tests
  sin errores (evidencia de que la sintaxis, los imports y los tipos son
  correctos, sin necesitar un navegador).
- **NO verificado en este sandbox — requiere un entorno desplegado
  real** (esto es literalmente lo que dice el nombre de la fase, no un
  atajo): `npx playwright install` no puede descargar binarios de
  navegador (`cdn.playwright.dev` no está en la allowlist de red del
  sandbox, mismo tipo de límite que bloquea `prisma generate` desde Fase
  0). Ninguno de los 84 tests se ejecutó de verdad contra un browser ni
  contra una app corriendo.
- 7 tests nuevos verificados (200 en total en el proyecto de Vitest) +
  84 tests de Playwright escritos y sintácticamente validados, sin
  correr.

## Fase 13 — CI/CD ✅
- `.github/workflows/ci.yml` — 4 jobs: `typecheck` (`tsc --noEmit`),
  `unit-tests` (`npm test` — los ~200 tests de Vitest, ninguno toca DB ni
  red real), `build` (`next build`), y `e2e` (Playwright, Fase 12) contra
  un servicio de Postgres efímero + el Inngest Dev Server local
  (`INNGEST_DEV=1`, mismo mecanismo que ya documentaba la sección Setup
  para desarrollo local — ver abajo). `e2e` corre en paralelo con
  `build`, pero solo después de que `typecheck`/`unit-tests` confirmen
  que lo básico anda, para no pagar el costo de levantar Postgres +
  tres navegadores si el código ni siquiera compila.
- **Hallazgo importante, no un bug de este pipeline**: cada fase anterior
  (0-12) se desarrolló en un sandbox donde `prisma generate` está
  bloqueado por red — ahí, `PrismaClient` queda tipado `any`
  (confirmado explícitamente en esta fase: hasta con
  `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` el fetch del binario mismo
  sigue dando 403), así que `tsc --noEmit` NUNCA pudo detectar un typo
  de campo en un `where`/`select`/`data` de Prisma en toda la vida del
  proyecto hasta ahora. Los runners de GitHub Actions sí tienen acceso
  de red completo — este pipeline es, literalmente, la primera vez que
  el código se type-checkea contra el cliente de Prisma REAL. Si el job
  `typecheck` encuentra algo la primera vez que corra, es exactamente el
  tipo de error que estaba esperando a ser descubierto.
- `playwright.config.ts` ganó un `webServer` (`next build && next
  start`, con `reuseExistingServer: !process.env.CI`): en CI levanta la
  app de producción solo, en desarrollo local reutiliza `npm run dev` si
  ya está corriendo.
- Sin tests nuevos de código de aplicación (es infraestructura de CI, no
  lógica de negocio) — la validación de esta fase fue: `tsc --noEmit` y
  `npm test` limpios con los cambios de `playwright.config.ts`,
  `npx playwright test --list` sigue funcionando (confirma que agregar
  `webServer` no rompe el listado sin levantar la app), y el YAML de
  `ci.yml` se parseó y se inspeccionó su estructura con `python3 -c
  "import yaml..."` (4 jobs, `services.postgres` presente, 9 steps en
  `e2e` en el orden esperado).

## Lo que falta a propósito (fases posteriores)
- i18n (Fase 9, continuación real): narrativas de insights ya
  persistidas, página `/score`, imágenes PNG de Open Graph — ver detalle
  arriba. Hacer dinámico el `metadata` de `app/layout.tsx` (hoy solo el
  atributo `lang` es locale-aware, `title`/`description` siguen fijos en
  español).
- Seguridad/compliance (Fase 10, continuación): no se agregó
  notificación por email cuando un export termina (el usuario tiene que
  volver a `/settings` para verlo) — se decidió no ampliar el sistema de
  `NotificationPreference` en esta pasada; es un candidato natural para
  cuando se retome. Tampoco hay panel de auditoría/logs de seguridad
  para el propio operador del producto.
- Performance/escalabilidad (Fase 11, continuación): la paginación actual
  itera todas las páginas dentro de UNA sola ejecución de la función. Si
  el volumen de usuarios creciera lo suficiente como para que eso
  acumule demasiados steps igual (varios cientos de miles de usuarios),
  el siguiente paso sería que la función se reinvoque a sí misma vía un
  evento de continuación con el último cursor, en vez de iterar todo
  adentro de una ejecución — no se justifica con el volumen actual (ver
  comentario en `lib/jobs/fanout.ts`). Tampoco se revisaron índices de DB
  ni un plan de particionamiento de `Commit`/`LanguageStat` para cuentas
  con historiales muy largos.
- Testing E2E (Fase 12, continuación): el flujo de aceptar/ver una
  comparación con dos usuarios simultáneos no se cubrió (requeriría un
  segundo `storageState` — ver comentario en `e2e/comparisons.spec.ts`).
- CI/CD (Fase 13, continuación): este pipeline nunca se ejecutó de
  verdad (ver "Límites conocidos" abajo) — la primera corrida real en un
  repo de GitHub con Actions habilitado es la que termina de validarlo,
  y es probable que necesite al menos un ajuste menor (nombres exactos
  de flags de `inngest-cli`, timing del Inngest Dev Server) que no se
  pudo verificar sin acceso a GitHub Actions real. No hay pipeline de
  deploy (Vercel ya hace deploy automático por Git push en su flujo
  estándar, así que no se agregó un job de deploy redundante) ni
  protección de rama configurada a nivel de repo (eso vive en la
  configuración de GitHub, no en código versionado).

Con esto se cierran las 14 fases (0-13) del roadmap de producto
completo (ver `DEVELOPMENT_ROADMAP.md`). Lo que queda son las
continuaciones reales documentadas arriba en cada fase, y todo lo que
solo se puede verificar corriendo esto fuera de este sandbox de
desarrollo.

## Setup

```bash
cp .env.example .env
# completa DATABASE_URL, GITHUB_CLIENT_ID/SECRET, AUTH_SECRET,
# TOKEN_ENCRYPTION_KEY (openssl rand -hex 32), INNGEST_EVENT_KEY/SIGNING_KEY,
# y opcionalmente RESEND_API_KEY/RESEND_FROM_EMAIL (Fase 8 — sin esto,
# las notificaciones caen a un no-op documentado, ver lib/notifications/email.ts)

npm install
npm run db:push     # o db:migrate si prefieres migraciones versionadas
npm run dev
```

En una segunda terminal, para procesar los jobs de sincronización en
desarrollo local:

```bash
npx inngest-cli@latest dev
```

### Crear la GitHub OAuth App
1. https://github.com/settings/developers → New OAuth App.
2. Homepage URL: `http://localhost:3000`
3. Callback URL: `http://localhost:3000/api/auth/callback/github`

Para correr los tests del Analytics Engine (no requieren DB ni red):

```bash
npm test
```

### Tests E2E (Fase 12)
Requieren la app corriendo (`npm run dev` o un deploy) y una DB de
test/staging dedicada — `e2e/seed.ts` crea y borra usuarios de prueba
reales, **nunca apuntar `E2E_BASE_URL`/`DATABASE_URL` a producción**.

```bash
npx playwright install          # primera vez: descarga los navegadores
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
npm run test:e2e:ui             # modo interactivo, útil para debuggear un spec
```

## Límites conocidos (verificación en sandbox)
Mismo principio de honestidad que las fases anteriores: lo que no se
pudo verificar acá se documenta en vez de marcarse como hecho sin
más.
- El envío real de emails vía Resend no se probó contra la API real
  (sin `RESEND_API_KEY` en este entorno) — sí se probó exhaustivamente
  el contrato HTTP (`lib/notifications/__tests__/email.test.ts`) con
  `fetch` mockeado, incluyendo el caso de éxito, status no-ok y fallo de
  red.
- `npx prisma generate` no puede descargar el binario del motor en este
  sandbox (mismo límite de red ya documentado en fases anteriores) — los
  modelos `NotificationPreference`/`NotificationLog` no se probaron
  contra Postgres real, solo con Prisma mockeado en los tests unitarios.
- El renderizado real del HTML del email (clientes de correo, dark mode,
  Gmail clipping) no se verificó visualmente — solo el contenido y la
  estructura del HTML generado.
- Fase 9: `npm run build` no llegó a compilar del todo en este sandbox
  por un límite de red distinto (Google Fonts, `fonts.googleapis.com`
  bloqueado) — no relacionado con el código de i18n. `tsc --noEmit` y
  los 165 tests sí corrieron limpios, incluyendo el middleware (se
  verificó por lectura que no importa nada de `node:crypto`, mismo bug
  que se arregló en Fase 0, pero no se pudo probar en un edge runtime
  real). El comportamiento del switcher de idioma en un navegador real
  (cookie + `router.refresh()`) tampoco se probó end-to-end.
- Fase 10: el upsert atómico de `RateLimitBucket` (`$queryRawUnsafe`) no
  se probó contra Postgres real — mismo límite de `prisma generate`
  bloqueado por red. La lógica de decisión (`evaluateRateLimit`) sí está
  100% cubierta por tests puros; lo no verificado es específicamente el
  SQL crudo bajo concurrencia real. Tampoco se verificó el flujo completo
  de borrado de cuenta contra una DB real con todas las cascadas
  (`onDelete: Cascade`) disparándose de verdad — se verificó por lectura
  del schema que cada relación de `User` las tiene declaradas, y
  `deleteAccount` se testeó con Prisma mockeado.
- Fase 11: la paginación por cursor y el batching de eventos se
  testearon como lógica pura (`buildCursorPageArgs`, `isLastPage`), pero
  los dos crons en sí (`reconcile.ts`, `wrapped-auto-generate.ts`) no se
  ejecutaron contra Postgres + Inngest reales con múltiples páginas de
  datos — no hay forma de generar decenas de miles de usuarios de prueba
  ni una cuenta de Inngest real en este sandbox. Se verificó por lectura
  que la query de Prisma usa un campo `@unique` como cursor en ambos
  casos (requisito de Prisma para que el cursor funcione).
- Fase 12: los 84 tests de Playwright (`e2e/`) se escribieron y se
  validaron con `npx playwright test --list` (descubre y parsea los 84
  sin error) + `tsc --noEmit`, pero NUNCA corrieron contra un navegador
  real — `npx playwright install` no puede descargar binarios porque
  `cdn.playwright.dev` no está en la allowlist de red de este sandbox.
  Lo que sí corrió y se verificó de verdad son los 7 tests de
  integración con `msw` (`lib/github/__tests__/client.integration.test.ts`),
  que no necesitan browser ni Postgres — y que cierran un gap real: la
  convención de usar `msw` estaba documentada desde fases tempranas pero
  nunca se había implementado.
- Fase 13: `.github/workflows/ci.yml` nunca corrió en GitHub Actions de
  verdad (este sandbox no tiene acceso a esa plataforma) — se validó lo
  que se pudo sin eso: sintaxis YAML parseada con `python3 -c "import
  yaml..."`, estructura de los 4 jobs inspeccionada programáticamente, y
  `tsc`/`vitest`/`playwright test --list` siguen pasando con los cambios
  de `playwright.config.ts` (el `webServer` nuevo). Los pasos más
  propensos a necesitar un ajuste en la primera corrida real: los flags
  exactos de `npx inngest-cli@latest dev` y el timing entre que arranca
  el Inngest Dev Server y que `next start` esté listo para recibir sus
  peticiones de discovery.

## Siguiente paso
Con la Fase 13 se cierran las 14 fases planeadas del roadmap de producto
(`DEVELOPMENT_ROADMAP.md`). No hay una "Fase 14" definida — los
candidatos concretos para continuar están listados en "Lo que falta a
propósito" arriba, sección por sección. El más inmediato y de mayor
señal: hacer un push a GitHub con Actions habilitado y ver qué dice el
job `typecheck` la primera vez que corre contra el cliente de Prisma
realmente generado (ver Fase 13 arriba) — es el chequeo que 13 fases de
desarrollo en este sandbox nunca pudieron hacer.
