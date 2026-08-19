# Decisions

Append-only log of significant architecture/design choices and why they were made. Entries are
never rewritten or deleted, even if a later decision supersedes one — add a new entry that notes
what changed instead. For what the app looks like *today*, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 2026-08-19 — PWA as the initial platform target

**Decision:** Build as a Progressive Web App first (installable, usable on the web), with native
app-store distribution as a possible future step rather than a day-one requirement.

**Why:** Wanted something usable in-browser immediately without committing to iOS/Android app
review processes up front. A PWA can be incrementally wrapped or migrated later if app-store
presence becomes a real need.

**Alternatives considered:** Local desktop app (Electron/Tauri), CLI/TUI.

---

## 2026-08-19 — TypeScript end-to-end

**Decision:** Use TypeScript for both frontend and backend, in a single codebase/toolchain.

**Why:** Solo, long-lived project — one language means shared types between client and server, one
dependency system, one set of tooling to maintain over time. Avoids the overhead of keeping two
ecosystems in sync for a project with a single maintainer.

**Alternatives considered:** Python (FastAPI) backend + TypeScript frontend — stronger data/analytics
libraries (pandas/numpy) and equally mature Plaid SDK support, but adds a second toolchain, no type
sharing without extra codegen, and two deploy units instead of one. Rejected since there's no
current need for heavy data analysis and the user doesn't already know Python well.

---

## 2026-08-19 — Unified Next.js app (not separate frontend/backend services)

**Decision:** Run frontend and backend as one Next.js app (API routes/server actions), one deploy
unit.

**Why:** Simpler operations for a solo project — one codebase, one deploy pipeline. Can still be
split into a separate backend service later if the app outgrows this, without having designed
against it.

**Alternatives considered:** Fully separate Node/Express backend service from day one — more
upfront structure and cleaner separation, but unnecessary complexity for the current scale.

---

## 2026-08-19 — PostgreSQL as the database

**Decision:** Use PostgreSQL for all persistent data.

**Why:** Financial data (transactions, categories, budgets) benefits from relational integrity and
foreign keys; Postgres comfortably handles the planned todo/scheduling features too.

---

## 2026-08-19 — Drizzle over Prisma

**Decision:** Use Drizzle as the ORM.

**Why:** Lightweight, SQL-like query style, strong TypeScript inference, easy to reason about the
actual generated SQL — a good fit for a project the user will keep hand-extending over time rather
than one relying on heavier framework magic.

**Alternatives considered:** Prisma — more batteries-included, very polished migration tooling and
docs, but a heavier runtime and less transparent about the SQL it generates.

---

## 2026-08-19 — Railway for hosting

**Decision:** Host on Railway (app + Postgres together).

**Why:** Simple setup, one dashboard for both app and database, generous free tier, easy secrets
management — good fit for a solo project that doesn't need fine-grained infra control.

**Alternatives considered:** Vercel + Neon (best-in-class Next.js DX on Vercel, but two separate
dashboards to manage); Fly.io (more infra control, more ops overhead than wanted right now).

---

## 2026-08-19 — Auth.js over Clerk

**Decision:** Use Auth.js (NextAuth) for authentication once auth is implemented (not yet built as
of this entry).

**Why:** Free, open-source, self-hosted, integrates natively with Next.js — no third-party service
dependency or eventual usage-based cost.

**Alternatives considered:** Clerk — more polished out-of-the-box UI, but adds a third-party
dependency and future cost as usage grows.

**Related:** initial framing considered "just a hardcoded password + session" given single-user
scope, but the user opted for a full auth provider instead, likely anticipating multi-user or
richer auth needs (social login/2FA) later.

---

## 2026-08-19 — Plaid for bank transaction data

**Decision:** Use Plaid (bank aggregator API) as the source of transaction data, over email-alert
parsing or manual entry.

**Why:** Most reliable and structured way to get transaction data automatically; official webhook
support fits the "notify me on every transaction" goal directly.

**Alternatives considered:** Parsing bank email/SMS alerts (free but fragile, breaks silently if the
bank changes its email format); manual entry (simplest/most private, but defeats the "automatic
notification" goal that motivated this feature).

**Tradeoff accepted:** introduces a third-party dependency with bank-level data access; access
tokens must be treated as sensitive secrets (see `plaid_items.accessToken` in the schema).

---

## 2026-08-19 — Hand-rolled service worker over Serwist

**Decision:** Write `public/sw.js` by hand rather than using a precaching library (Serwist, the
maintained successor to next-pwa).

**Why:** Push notifications (the driving feature) require custom `push`/`notificationclick` handlers
regardless of tooling choice, so a library's main value-add — automatic precaching/offline support
of the full app shell — wasn't worth the added dependency and build-step complexity at this stage.
Full control and a service worker simple enough to read top-to-bottom mattered more right now.

**Alternatives considered:** Serwist — robust offline support with proper cache versioning, but more
moving parts than needed yet. Can revisit if real offline browsing (not just install/push) becomes
a goal.

---

## 2026-08-19 — Local Postgres via Docker for development

**Decision:** Run a local Dockerized Postgres for dev (`docker-compose.yml`), separate from the
Railway instance used in production.

**Why:** Fast, free, works offline, and keeps local development from ever touching real/prod data.

**Alternatives considered:** Connecting directly to a cloud Railway Postgres instance even in dev —
no Docker dependency, but couples local work to a live cloud database and requires provisioning
Railway before any local development could start.

---

## 2026-08-19 — Manual sync trigger instead of a live Plaid webhook (for now)

**Decision:** Build the Plaid transaction pipeline with a manually-triggered "Sync transactions"
button instead of a live webhook, deferring real-time push notifications.

**Why:** Plaid webhooks require a publicly reachable URL; localhost can't receive them. Rather than
set up a tunnel (ngrok/Cloudflare) before the core data pipeline was even validated, built and
tested the full Link → store → sync → categorize flow first against Plaid sandbox.

**Alternatives considered:** Setting up a tunnel immediately to build the real webhook → Web Push
flow end-to-end from the start — more upfront setup, defers validating the base pipeline.

**Follow-up:** real-time notifications still need to be built — either via a tunnel for continued
local testing, or once the app is deployed to Railway and has a real public URL.

---

## 2026-08-19 — No `users` table yet; schema is single-user

**Decision:** Ship the initial Plaid-related schema (`plaid_items`, `plaid_accounts`, `transactions`,
`categories`) without a `users` table or `user_id` foreign keys.

**Why:** Auth.js (not yet implemented) has its own expected schema shape for its Drizzle adapter;
building a throwaway `users` table now risked conflicting with that later. Since the app is
explicitly single-user for now, deferring this was lower-risk than guessing at Auth.js's schema
requirements ahead of time.

**Follow-up:** when Auth.js is wired up, add its adapter tables plus a `user_id` column on the
Plaid-related tables via a new migration.
