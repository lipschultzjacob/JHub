# Architecture

Living document describing how JHub is built *right now*. Unlike [DECISIONS.md](DECISIONS.md)
(which is an append-only log of *why* choices were made), this file gets rewritten in place
as the app changes — it should always describe the current state, not the history.

**Maintenance rule:** any change that adds a new moving part, a new data flow, or a new
directory convention should update this file in the same commit. If you're reading this
after a feature landed and it's not reflected here, the doc is stale — fix it before
extending further.

## Stack

| Layer          | Choice                          |
|----------------|----------------------------------|
| Language       | TypeScript, end-to-end          |
| Framework      | Next.js (App Router), unified frontend + backend in one app |
| Styling        | Tailwind CSS                    |
| Database       | PostgreSQL                      |
| ORM            | Drizzle                         |
| Auth           | Auth.js (NextAuth) — not yet implemented |
| Bank data      | Plaid                           |
| Push           | Web Push (VAPID), no third-party push service |
| Hosting target | Railway                         |
| Local dev DB   | Postgres via Docker Compose     |

See [DECISIONS.md](DECISIONS.md) for the reasoning behind each of these.

## Repo layout

```
JHub/
├── src/
│   ├── app/                     Next.js App Router — folders = routes
│   │   ├── layout.tsx            root shell: fonts, metadata, service worker registration
│   │   ├── page.tsx               home page ("/")
│   │   ├── manifest.ts            PWA manifest, auto-served at /manifest.webmanifest
│   │   ├── transactions/
│   │   │   └── page.tsx          transactions list + bank connect + categorization UI
│   │   └── api/
│   │       ├── plaid/
│   │       │   ├── link-token/    POST — issues a Plaid Link token
│   │       │   ├── exchange-token/ POST — exchanges public_token for access_token, stores item+accounts
│   │       │   └── sync/          POST — pulls transactions via /transactions/sync (manual stand-in for webhook)
│   │       └── transactions/[id]/ PATCH — set a transaction's category
│   ├── components/               Client components (interactive pieces)
│   │   ├── service-worker-registration.tsx
│   │   ├── plaid-link-button.tsx
│   │   ├── sync-button.tsx
│   │   └── category-select.tsx
│   ├── db/
│   │   ├── schema.ts              Drizzle table definitions (source of truth for DB shape)
│   │   └── index.ts               Drizzle client (postgres-js), connection pooling across dev reloads
│   └── lib/
│       └── plaid.ts               Plaid API client configuration
├── drizzle/                      Generated SQL migrations + snapshots (never hand-edit; regenerate via schema.ts)
├── scripts/
│   ├── generate-icons.mjs        Regenerates PWA icon PNGs (placeholder branding — rerun after real branding exists)
│   └── seed-categories.ts        Seeds default budgeting categories, idempotent
├── public/
│   ├── sw.js                     Hand-rolled service worker (install/activate/fetch/push/notificationclick)
│   └── icons/                    PWA icon files referenced by manifest.ts and layout.tsx
├── docker-compose.yml            Local-only Postgres for dev
├── drizzle.config.ts             drizzle-kit CLI config (generate/migrate/studio)
└── next.config.ts                Turbopack root pinning, etc.
```

## How the pieces connect

### Request model
Server Components (the default — `page.tsx`, `layout.tsx`) render on the server and can query
the database directly via `db` from `src/db`, no API layer needed. A component only becomes a
Client Component (browser-side, interactive) when it starts with `"use client"` — that's
everything in `src/components/` currently, since they all need event handlers or browser APIs
(`navigator.serviceWorker`, Plaid Link's iframe, etc.).

### PWA layer
- `src/app/manifest.ts` — Next's file-convention manifest route, defines install metadata (name,
  icons, standalone display mode).
- `public/sw.js` — plain-JS service worker, registered by
  `src/components/service-worker-registration.tsx` (production only; dev actively unregisters any
  stale worker to avoid fighting Turbopack's HMR). Currently handles: install-time precache of `/`,
  network-first fetch with offline fallback, and `push`/`notificationclick` stubs waiting on the
  real notification payload shape.

### Database
Local dev points at a Dockerized Postgres (`docker-compose.yml`), started with `docker compose up -d`.
Production will point at a Railway-hosted Postgres via `DATABASE_URL`. Schema changes always flow
through Drizzle: edit `src/db/schema.ts` → `npm run db:generate` (writes a migration into `drizzle/`)
→ `npm run db:migrate` (applies it). Never hand-edit generated migration files.

Current tables (no `users` table yet — schema is single-user; a `users` table and `user_id` foreign
keys get added once Auth.js is wired up):
- `categories` — budgeting categories (seeded with defaults via `npm run db:seed`)
- `plaid_items` — one row per bank connection; holds the Plaid `access_token` and the sync `cursor`
- `plaid_accounts` — individual accounts (checking/savings/etc.) under a `plaid_items` row
- `transactions` — one row per Plaid transaction, FKs to `plaid_accounts` and optionally `categories`

### Plaid data flow
1. Frontend calls `POST /api/plaid/link-token` → gets a short-lived `link_token`.
2. `PlaidLinkButton` opens Plaid's hosted Link UI with that token (bank picker + login — Plaid never
   shares bank credentials with us).
3. On success, Link returns a `public_token` → sent to `POST /api/plaid/exchange-token`, which
   exchanges it server-side for the real `access_token`, stores a `plaid_items` row, and fetches +
   stores the linked `plaid_accounts`.
4. `SyncButton` calls `POST /api/plaid/sync`, which loops every `plaid_items` row and calls Plaid's
   cursor-based `/transactions/sync` until `has_more` is false, upserting into `transactions` (without
   clobbering a manually-set `categoryId` on updates) and persisting the new cursor.
5. `CategorySelect` on the transactions page PATCHes `/api/transactions/[id]` to set/clear a category.

**Known gap:** step 4 is manual right now. The real target is a Plaid webhook firing automatically on
new transactions, which then triggers a Web Push notification with an inline category picker — that
needs a publicly reachable URL (deploy or tunnel) and hasn't been built yet.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` | Plaid API credentials |
| `PLAID_ENV` | `sandbox` \| `development` \| `production` |

See `.env.example` for the template; real values go in `.env.local` (gitignored).

## Not yet built
- Authentication (Auth.js) — everything is currently unauthenticated; do not deploy publicly as-is
- Plaid webhook + Web Push notification delivery (the original driving feature — manual sync is the
  current stand-in)
- Todo/scheduling and any other planned productivity-hub features beyond financials
