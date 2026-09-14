<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/readme_assets/github-wrapped.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/readme_assets/github-wrapped-dark.svg">
  <img alt="GitHub Wrapped" src="docs/readme_assets/github-wrapped.svg" width="300">
</picture>

<p align="center">
  <strong>your annual developer recap, generated from real GitHub activity — Spotify Wrapped for your commit history</strong>
</p>

<p align="center">
  <a href="https://my-github-wrapped.vercel.app" target="_blank">Take a look!</a>
</p>

<img src="https://img.shields.io/badge/frontend-next.js_14-1f262e?style=flat-square">
<img src="https://img.shields.io/badge/backend-next.js-409725?style=flat-square">
<img src="https://img.shields.io/badge/jobs-inngest-a9dc41?style=flat-square">
<img src="https://img.shields.io/badge/database-neondb-b0e6a2?style=flat-square">

<p align="justify">
GitHub Wrapped analyzes a developer's public GitHub activity — commits, repositories, languages, and working hours — and turns it into a personalized, shareable annual recap, in the style of Spotify Wrapped. The goal isn't just to show numbers: it's to surface behavioral insights that help developers actually understand their habits, backed by an Analytics Engine that computes every statistic before any AI-generated narration touches it.<br> The platform connects via GitHub OAuth, syncs activity through a background job queue (never inline in an HTTP request), and generates a slide-by-slide Wrapped experience with public, shareable pages and auto-generated Open Graph images.
</p>

| | |
| ---- | ---- |
| - Full activity sync via GitHub REST + GraphQL, timezone-aware.   | - Analytics Engine independent of GitHub, the DB, and the UI.     |
| - AI-narrated insights over pre-computed statistics, never guessed. | - Shareable public Wrapped pages with auto-generated OG images.   |
| - Badges, comparisons between users, and year-over-year tracking. | - Encrypted tokens, IDOR-safe endpoints, HMAC-verified webhooks.  |

</div>

---

## Objective

The objective of GitHub Wrapped is to transform raw GitHub activity into a visual, entertaining, and genuinely useful year-in-review — one developers actually want to share — while keeping every statistic traceable back to real data instead of an AI's best guess.

---

## Data Collection Module

<table>
<tr>
<td width="33%" valign="top">
<h3>🔌 GitHub API Client</h3>

- REST client for users, repositories, commits, and languages per repo
- GraphQL client dedicated to the contribution calendar and combined queries
- Independent rate-limit handling for REST (5,000 req/hour) and GraphQL (point system)
- Automatic pagination on every list endpoint

</td>
<td width="33%" valign="top">
<h3>Retry & Resilience</h3>

- Exponential backoff with jitter on 403/429 responses
- Respects GitHub's `retry-after` header when present
- Never retries errors that aren't rate-limit related

</td>
<td width="33%" valign="top">
<h3>Identity Resolution</h3>

- Commit ownership resolved against the authenticated user's login, not just "any linked GitHub account"
- Fallback to verified account emails for commits GitHub didn't auto-link
- Covers shared repos, organization repos, and collaborator affiliations correctly

</td>
</tr>
</table>

---

## Authentication

<table>
<tr>
<td width="33%" valign="top">
<h3>OAuth</h3>

- Auth.js with the GitHub provider, database session strategy
- Minimum scope on first login: `read:user user:email public_repo`
- Encrypted access/refresh tokens at rest (AES-256-GCM), never logged, never in plain text

</td>
<td width="33%" valign="top">
<h3>Incremental Authorization</h3>

- Private-repo analysis is opt-in, requested separately from `/settings`
- Re-authorization upgrades the scope to `repo` without a second OAuth App
- Token persisted on every sign-in, not only on first account link

</td>
<td width="33%" valign="top">
</td>
</tr>
</table>

---

## Job Queue (Inngest)

> All heavy processing runs async, outside the lifecycle of an HTTP request — a user with tens of thousands of commits should never be limited by a serverless function timeout.

<table>
<tr>
<td width="25%" valign="top">
<h3>Sync</h3>

- Initial, incremental, and full sync modes
- Fan-out across repositories with cursor pagination
- Progress pollable from the dashboard

</td>
<td width="25%" valign="top">
<h3>Insights</h3>

- Triggered once analytics for a period are ready
- Feeds only pre-computed metrics into the narration step

</td>
<td width="25%" valign="top">
<h3>Wrapped Generation</h3>

- Generates the full slide deck for a given year
- Auto-generation cron for closed years, plus on-demand generation

</td>
<td width="25%" valign="top">
<h3>Recurring Jobs</h3>

- Daily reconciliation cron (catches anything webhooks missed)
- Daily check for auto-generating just-closed years
- Both are native Inngest crons, not Vercel crons

</td>
</tr>
</table>

---

## Analytics Engine

> Deliberately decoupled from the GitHub API, the database, and the UI — testable with no network and no live database.

<table>
<tr>
<td width="33%" valign="top">
<h3>Timezone Normalization</h3>

- Every timestamp converted to the user's local timezone before aggregation, never UTC
- Most active day/hour, streaks, and activity heatmaps computed on local time
- Covered by unit tests across multiple timezones

</td>
<td width="33%" valign="top">
<h3>Metrics</h3>

- Favorite language (by bytes, not commit count — a fairer measure)
- Most active repository, commit streaks, activity by day/hour
- Language Evolution as a time series, not a single snapshot

</td>
<td width="33%" valign="top">
<h3>Developer Activity Score</h3>

- A composite score — intentionally never called "Productivity Score"
- More commits doesn't mean more productivity or quality, and the naming says so

</td>
</tr>
</table>

---

## Wrapped Experience

<table>
<tr>
<td width="33%" valign="top">
<h3>Slide Deck</h3>

- Slide-by-slide storytelling, not a static dashboard
- Covers languages, repos, streaks, activity patterns, and the Activity Score

</td>
<td width="33%" valign="top">
<h3>Sharing</h3>

- Public page per user and year, no authentication required to view
- Auto-generated Open Graph image per slide for rich link previews
- One-click share to social platforms, downloadable image, copy link

</td>
<td width="33%" valign="top">
<h3>Insights Engine</h3>

- AI narration strictly over already-computed statistics — never calculates numbers itself
- Falls back to deterministic templates when no AI key is configured

</td>
</tr>
</table>

---

## Comparisons & Gamification

<table>
<tr>
<td width="33%" valign="top">
<h3>Comparisons</h3>

- Invite another user to compare a period side by side
- Comparison detail view with per-metric breakdown

</td>
<td width="33%" valign="top">
<h3>Badges</h3>

- Automatic badge awarding based on computed activity
- Grid view on the dashboard with earned/locked state

</td>
<td width="33%" valign="top">
</td>
</tr>
</table>

---

## Settings

<table>
<tr>
<td width="25%" valign="top">
<h3>Locale</h3>

- Language preference (English/Spanish), persisted per user
- Detected automatically on first visit via `Accept-Language`

</td>
<td width="25%" valign="top">
<h3>Notifications</h3>

- Email preferences via Resend
- Optional — the pipeline works with notifications fully disabled

</td>
<td width="25%" valign="top">
<h3>Private Repos</h3>

- Opt-in toggle, triggers incremental OAuth re-authorization
- Full purge job available to revoke and delete private-repo data

</td>
<td width="25%" valign="top">
<h3>Account</h3>

- Full data export (JSON), downloadable once ready
- Account deletion gated by typed username confirmation

</td>
</tr>
</table>

---

## Security & Optimization

> Prepared for production, not just for a demo.

<table>
<tr>
<td width="33%" valign="top">
<h3>Security</h3>

- Tokens encrypted at rest, never in logs
- HMAC-verified GitHub webhooks
- Ownership checks on every by-ID resource (no IDOR)
- CSP and standard security headers on all non-API routes

</td>
<td width="33%" valign="top">
<h3>Performance</h3>

- All heavy work offloaded to the job queue
- Atomic, race-condition-safe rate limiting at the database level
- Cursor-based pagination for large fan-outs

</td>
<td width="33%" valign="top">
<h3>Testing</h3>

- Unit + integration tests with `msw` (never against the real GitHub API)
- E2E coverage with Playwright, including a dedicated security spec
- CI: typecheck, unit tests, build, and E2E on every push

</td>
</tr>
</table>

---

## Tools Used

<img src="https://img.shields.io/badge/Next.js-14-1f262e?style=flat-square"> <img src="https://img.shields.io/badge/TypeScript-5-409725?style=flat-square"> <img src="https://img.shields.io/badge/Prisma-ORM-a9dc41?style=flat-square"> <img src="https://img.shields.io/badge/PostgreSQL-Neon-b0e6a2?style=flat-square"> <img src="https://img.shields.io/badge/TailwindCSS-3-1f262e?style=flat-square"> <img src="https://img.shields.io/badge/Auth.js-GitHub_OAuth-409725?style=flat-square"> <img src="https://img.shields.io/badge/Inngest-Job_Queue-a9dc41?style=flat-square"> <img src="https://img.shields.io/badge/Recharts-Charts-b0e6a2?style=flat-square"> <img src="https://img.shields.io/badge/Vitest-Testing-1f262e?style=flat-square"> <img src="https://img.shields.io/badge/Playwright-E2E-409725?style=flat-square">

---

## System Architecture

```bash
GitHub (REST + GraphQL) → Data Collector → Job Queue (Inngest) → Database (PostgreSQL) → Analytics Engine → Insights Engine → Dashboard / Wrapped / Sharing
```

---

## Getting Started

GitHub Wrapped is a hosted web app — there's nothing to install to use it.

1. Go to the live app (link at the top of this README).
2. Click **"Connect with GitHub"** and authorize the OAuth App.
3. Wait for the first sync to finish (progress is shown on `/dashboard`).
4. Open `/wrapped` to see your recap, or share your public page once it's generated.

Private repositories are never analyzed unless you explicitly opt in from `/settings`.

---

## Self-Hosting

Running your own instance requires a GitHub OAuth App, a PostgreSQL database, and an Inngest account. Full step-by-step setup (creating each of these, exact env vars, and deploying to Vercel) is in [`DOCUMENT`]().

```bash
git clone https://github.com/emilymontec/github-wrapped.git; cd github-wrapped
npm install
```

### Environment variables

```bash
DATABASE_URL=POSTGRES_POOLED_URL
AUTH_SECRET=AUTH_SECRET
AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=GITHUB_OAUTH_CLIENT_ID
GITHUB_CLIENT_SECRET=GITHUB_OAUTH_CLIENT_SECRET
TOKEN_ENCRYPTION_KEY=TOKEN_ENCRYPTION_KEY
INNGEST_EVENT_KEY=INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY=INNGEST_SIGNING_KEY
GITHUB_WEBHOOK_SECRET=GITHUB_WEBHOOK_SECRET
WEBHOOK_BASE_URL=http://localhost:3000
ANTHROPIC_API_KEY=ANTHROPIC_API_KEY
RESEND_API_KEY=RESEND_API_KEY
RESEND_FROM_EMAIL=RESEND_FROM_EMAIL
```

<sub> create the `.env` file and configure the environment variables — see `.env.example` for details on each one </sub>

### Database configuration

```bash
npx prisma generate
npx prisma migrate dev
```

### Run the application

```bash
npm run dev
```

<sub> Application available at: http://localhost:3000 </sub>

---

## File Structure

```bash
github-wrapped/
│
├── app/
│   ├── [username]/wrapped/[year]/
│   ├── account/
│   ├── analytics/
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   ├── inngest/
│   │   └── webhooks/github/
│   ├── badges/
│   ├── comparisons/
│   ├── compare/
│   ├── dashboard/
│   ├── insights/
│   ├── score/
│   ├── settings/
│   ├── sync/
│   └── wrapped/
│
├── components/
│   ├── comparisons/
│   ├── dashboard/
│   ├── settings/
│   └── wrapped/
│
├── lib/
│   ├── analytics/
│   ├── auth/
│   ├── gamification/
│   ├── github/
│   ├── insights/
│   ├── jobs/
│   ├── notifications/
│   ├── ratelimit/
│   └── webhooks/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── e2e/
├── public/
├── package.json
├── tsconfig.json
├── next.config.mjs
├── vercel.json
├── .env.example
└── README.md
```

---

## Contributing

### Fork repository

**Create branch**

```bash
git checkout -b feature/my-feature
```

**Commit changes**

```bash
git commit -m "Add new feature"
```

**Push changes**

```bash
git push origin feature/my-feature
```

Open a Pull Request describing the proposed changes.

---

## Author

**Emily Monterrosa Castro - Full Stack Developer** <br>
[GitHub](https://github.com/emilymontec) · [LinkedIn](https://www.linkedin.com/in/emilymontec/) · [Portfolio](https://emilymontec.github.io/portfolio/)

---

## License

AGPL-3.0.

See the [LICENSE](LICENSE) file for additional information.

---

<!--
## Appendices
See the [UserGuide](docs/) to learn more.

If you want to know more about the system, please check the [Documentation](docs/).
-->