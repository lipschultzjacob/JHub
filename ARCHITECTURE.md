# Architecture

This document describes how JHub is built *right now*. Unlike [DECISIONS.md](DECISIONS.md) (a log
of *why* each choice was made, kept for history), this file gets rewritten in place as the app
changes — it should always describe today's setup, not yesterday's.

**Maintenance rule:** any change that adds a new moving part, a new flow of data, or a new folder
convention should update this file in the same commit. If you're reading this after a feature
landed and it's not reflected here, the doc is out of date — fix it before building more on top.

This doc assumes you're not deeply familiar with web development, so unfamiliar terms are briefly
explained the first time they show up.

## Stack

| Layer          | Choice                          |
|----------------|----------------------------------|
| Language       | TypeScript (JavaScript with type-checking added — catches whole categories of bugs before the code even runs), used for both the browser-facing code and the server code |
| Framework      | Next.js — a toolkit that handles both the pages you see and the backend logic in one project, so there's no separate "frontend app" and "backend app" to keep in sync |
| Styling        | Tailwind CSS — write styling directly as class names on elements instead of separate `.css` files |
| Database       | PostgreSQL (Postgres for short) — where all persistent data (transactions, categories, etc.) is stored |
| ORM            | Drizzle — a library that lets us describe and query the database using TypeScript instead of writing raw SQL by hand ("ORM" = Object-Relational Mapper, the general name for this kind of tool) |
| Auth           | Auth.js (NextAuth) — a login/session library. Not implemented yet, so right now there is no login screen protecting anything |
| Bank data      | Plaid — a service that connects to your bank on our behalf and hands us transaction data, without us ever seeing your bank password |
| Push           | Web Push — the browser's built-in system for sending notifications, using a standard called VAPID to prove the notification really came from this app. No third-party notification service (like Firebase) involved |
| Hosting target | Railway — the cloud service we plan to deploy the live app and database to |
| Local dev DB   | A Postgres database running locally in Docker (a tool that runs an isolated copy of a program, here Postgres, on your own machine without installing it directly) |

See [DECISIONS.md](DECISIONS.md) for the reasoning behind each of these.

## Repo layout

```
JHub/
├── src/
│   ├── app/                     Next.js's routing system: each folder here becomes a URL
│   │   ├── layout.tsx            the shared page shell every page renders inside (fonts, page title, registers the service worker below)
│   │   ├── page.tsx               the home page, served at "/"
│   │   ├── manifest.ts            describes the app for "install as an app" purposes, auto-served at /manifest.webmanifest
│   │   ├── transactions/
│   │   │   └── page.tsx          the transactions page: connect a bank, view transactions, assign categories
│   │   └── api/                  backend endpoints the frontend calls (no separate backend project needed)
│   │       ├── plaid/
│   │       │   ├── link-token/    creates a short-lived token so the browser can open Plaid's "connect your bank" popup
│   │       │   ├── exchange-token/ turns that popup's result into a real, long-lived connection to your bank
│   │       │   └── sync/          fetches new transactions from Plaid (currently triggered manually by a button, see below)
│   │       └── transactions/[id]/ lets the frontend set which category a transaction belongs to
│   ├── components/               Interactive pieces of the UI (buttons, dropdowns) that run in the browser
│   │   ├── service-worker-registration.tsx
│   │   ├── plaid-link-button.tsx
│   │   ├── sync-button.tsx
│   │   └── category-select.tsx
│   ├── db/
│   │   ├── schema.ts              defines the shape of every database table in TypeScript — this file is the single source of truth for what the database looks like
│   │   └── index.ts               sets up the connection to the database that the rest of the app uses
│   └── lib/
│       └── plaid.ts               configuration for talking to Plaid's API
├── drizzle/                      Auto-generated files describing each change ever made to the database's structure (a "migration" — see Database section). Don't hand-edit these; they're regenerated from schema.ts
├── scripts/
│   ├── generate-icons.mjs        regenerates the app's icon images (currently simple placeholders — rerun this once real branding/logo exists)
│   └── seed-categories.ts        fills in a starter set of budgeting categories; safe to run more than once
├── public/
│   ├── sw.js                     the service worker (explained below)
│   └── icons/                    icon image files used by manifest.ts and layout.tsx
├── docker-compose.yml            config for the local-only Postgres database used during development
├── drizzle.config.ts             settings for Drizzle's command-line tool (the commands that create/apply database changes)
└── next.config.ts                Next.js configuration
```

## How the pieces connect

### How pages and data fetching work
By default, every page/component here runs on the server, not in the browser — it renders to HTML
before it ever reaches your device, and it's allowed to talk to the database directly (see `db` from
`src/db`) without going through a separate API call. This is called a "Server Component."

A component only runs in the *browser* instead when the file starts with `"use client"` at the top
— that's called a "Client Component," and it's needed whenever something has to react to clicks,
hold on-screen state, or use browser-only features. Everything in `src/components/` is a Client
Component, because each one needs that: registering the service worker, opening Plaid's popup, or
saving a dropdown change.

### The "installable app" layer (PWA)
"PWA" stands for Progressive Web App — a website that can be installed like a real app (icon on your
home screen, opens in its own window, works partly offline).
- `src/app/manifest.ts` — tells the browser what to call the app and which icon/colors to use when
  it's installed.
- `public/sw.js` — the "service worker": a small script the browser keeps running in the background,
  separate from any open tab, even after you close the app. This is what makes offline behavior and
  push notifications possible — without it, neither would work. It's registered (turned on) by
  `src/components/service-worker-registration.tsx`, but only in the production build; during
  development it's deliberately turned off, because a service worker's caching would otherwise make
  it look like your code changes aren't taking effect while you're actively editing. Right now it:
  saves a copy of the home page for offline use, prefers fetching fresh data over the network but
  falls back to that saved copy if you're offline, and has placeholder handlers ready for push
  notifications once that feature is built.

### Database
During development, the app talks to a Postgres database running locally in Docker
(`docker-compose.yml`), started with `docker compose up -d`. In production it'll talk to a
Postgres database hosted on Railway instead, via the `DATABASE_URL` setting.

Whenever the shape of the database needs to change (a new table, a new column), the process is:
edit `src/db/schema.ts` → run `npm run db:generate` (this writes a "migration" — a file recording
exactly what changed — into the `drizzle/` folder) → run `npm run db:migrate` (this applies that
change to the actual database). Never hand-edit the generated migration files.

Current tables (there's no `users` table yet, because the app is single-user for now; a `users`
table gets added once Auth.js/login is built):
- `categories` — the budgeting categories you sort transactions into (starter ones are added by
  `npm run db:seed`)
- `plaid_items` — one row per bank you've connected; holds the credential Plaid gave us for that
  connection and a bookmark ("cursor," see below) of how far we've synced
- `plaid_accounts` — the individual accounts (checking, savings, etc.) that belong to a connected
  bank
- `transactions` — one row per transaction, linked to which account it came from and (optionally)
  which category you assigned it

### How the Plaid (bank) integration works, step by step
1. The frontend asks our own backend for a "link token" (`POST /api/plaid/link-token`) — a
   short-lived pass that lets the browser open Plaid's connection popup.
2. `PlaidLinkButton` opens that popup. You pick your bank and log in *inside Plaid's popup* — your
   bank password is never seen by this app.
3. On success, Plaid hands the browser a `public_token`. The frontend sends that to
   `POST /api/plaid/exchange-token`, which trades it, on the server, for the real long-lived
   connection credential (the `access_token`) — this step has to happen on the server because that
   credential is a secret that should never reach the browser. It's saved to `plaid_items`, and the
   bank's individual accounts are fetched and saved to `plaid_accounts`.
4. Clicking "Sync transactions" calls `POST /api/plaid/sync`, which asks Plaid for anything new
   since last time. Plaid's sync API works with a "cursor" — think of it like a bookmark: each
   response comes with a new cursor to save and send back next time, so Plaid only has to tell us
   what changed instead of resending everything. New/changed transactions are saved with an
   "upsert" (insert it if it's new, update it if it already exists) — and updating deliberately
   never overwrites a category you already picked by hand.
5. The category dropdown on the transactions page calls `PATCH /api/transactions/[id]` to save
   which category you picked.

**Known gap:** step 4 currently requires clicking a button. The actual goal is for Plaid to notify
us the moment a new transaction happens (a "webhook" — Plaid calling *our* server automatically),
which would then send you a push notification with a category picker built in. That needs our
server to have a public web address Plaid can reach, which it doesn't yet (it only exists on your
own machine right now) — so this is still ahead of us.

## Environment variables

"Environment variables" are settings/secrets kept outside the code (in a `.env.local` file that's
never committed to git), so things like passwords aren't stored in the codebase itself.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | How to connect to the Postgres database |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` | Credentials that prove to Plaid this app is allowed to use their API |
| `PLAID_ENV` | Which Plaid environment to talk to: `sandbox` (fake test data), `development`, or `production` (real banks) |

See `.env.example` for the template; real values go in `.env.local` (which is excluded from git).

## Not yet built
- Login/authentication (Auth.js) — everything is currently open to anyone who can reach the app; it
  should not be put on a public web address as-is
- The Plaid webhook + push notification delivery described above (the original goal of this
  feature — the manual sync button is a placeholder for it)
- Todos/scheduling and any other planned productivity-hub features beyond the financial tracking
