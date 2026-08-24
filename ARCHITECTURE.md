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
| Auth           | Auth.js (NextAuth) — a login/session library, using email+password and encrypted-cookie ("JWT") sessions |
| Bank data      | Plaid — a service that connects to your bank on our behalf and hands us transaction data, without us ever seeing your bank password |
| Push           | Web Push — the browser's built-in system for sending notifications, using a standard called VAPID to prove the notification really came from this app. No third-party notification service (like Firebase) involved |
| Hosting       | Vercel (the app) + Neon (the production Postgres database) — both free indefinitely for personal-project usage levels |
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
│   │   ├── login/page.tsx          the login form
│   │   ├── signup/page.tsx         the create-account form
│   │   ├── transactions/
│   │   │   └── page.tsx          the transactions page: connect a bank, view transactions, assign categories
│   │   └── api/                  backend endpoints the frontend calls (no separate backend project needed)
│   │       ├── auth/
│   │       │   ├── [...nextauth]/ Auth.js's own required routes (login, logout, session check, etc.)
│   │       │   └── signup/        creates a new account (Auth.js only handles logging in, not registration)
│   │       ├── plaid/
│   │       │   ├── link-token/    creates a short-lived token so the browser can open Plaid's "connect your bank" popup
│   │       │   ├── exchange-token/ turns that popup's result into a real, long-lived connection to your bank
│   │       │   └── sync/          fetches new transactions from Plaid (currently triggered manually by a button, see below)
│   │       └── transactions/[id]/ lets the frontend set which category a transaction belongs to
│   ├── components/               Interactive pieces of the UI (buttons, dropdowns) that run in the browser
│   │   ├── service-worker-registration.tsx
│   │   ├── auth-session-provider.tsx  makes the current login session available throughout the app
│   │   ├── sign-out-button.tsx
│   │   ├── plaid-link-button.tsx
│   │   ├── sync-button.tsx
│   │   └── category-select.tsx
│   ├── db/
│   │   ├── schema.ts              defines the shape of every database table in TypeScript — this file is the single source of truth for what the database looks like
│   │   └── index.ts               sets up the connection to the database that the rest of the app uses
│   ├── lib/
│   │   ├── plaid.ts               configuration for talking to Plaid's API
│   │   └── default-categories.ts  the starter category list given to every new account
│   ├── types/
│   │   └── next-auth.d.ts         small type addition so TypeScript knows about the user ID we attach to sessions
│   ├── auth.ts                    Auth.js configuration: how login works, what a session contains
│   └── proxy.ts                   runs before every page request; redirects signed-out visitors to /login (see "Login" below)
├── drizzle/                      Auto-generated files describing each change ever made to the database's structure (a "migration" — see Database section). Don't hand-edit these; they're regenerated from schema.ts
├── scripts/
│   ├── generate-icons.mjs        regenerates the app's icon images (currently simple placeholders — rerun this once real branding/logo exists)
│   └── seed-categories.ts        adds the default categories to one existing account by email (new accounts get these automatically at signup instead)
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

### Login
Every page except `/login` and `/signup` requires being logged in. `src/proxy.ts` (in this Next.js
version, the file that used to be called `middleware.ts` -- it runs before a page is rendered) checks
for a valid session and redirects to `/login` if there isn't one. On top of that, every API route
under `src/app/api/plaid/` and `src/app/api/transactions/` also checks the session itself and
returns a `401 Unauthorized` if it's missing -- this isn't redundant: Next.js's own docs specifically
warn that a future change to `proxy.ts`'s matcher could silently stop protecting a route, so each
route protects itself rather than trusting that file alone.

Logging in uses Auth.js's "Credentials" provider (a plain email+password form) --
`src/auth.ts` contains the actual logic that checks a typed-in password against the scrambled
version stored in the `users` table (see Database below). Auth.js doesn't handle creating new
accounts itself, only logging in, so `POST /api/auth/signup` is a small custom-written endpoint
that creates the account (and gives it a starter set of categories) before immediately logging it in.

Sessions use the "JWT" strategy: your logged-in state lives in an encrypted browser cookie rather
than a database row, which is simpler to set up but means there's no way to remotely force one
specific session to log out (changing your password is the only way to invalidate a session early).

### Database
During development, the app talks to a Postgres database running locally in Docker
(`docker-compose.yml`), started with `docker compose up -d`. In production it'll talk to a
Postgres database hosted on Neon instead, via the `DATABASE_URL` setting.

Whenever the shape of the database needs to change (a new table, a new column), the process is:
edit `src/db/schema.ts` → run `npm run db:generate` (this writes a "migration" — a file recording
exactly what changed — into the `drizzle/` folder) → run `npm run db:migrate` (this applies that
change to the actual database). Never hand-edit the generated migration files.

Current tables:
- `users` — one row per person who can log in; stores their email and a scrambled (never
  reversible) version of their password
- `categories` — the budgeting categories you sort transactions into, one set per user (new
  accounts get a starter set automatically at signup; `npm run db:seed -- you@example.com` can
  re-add them to an existing account)
- `plaid_items` — one row per bank a user has connected; holds the credential Plaid gave us for
  that connection and a bookmark ("cursor," see below) of how far we've synced
- `plaid_accounts` — the individual accounts (checking, savings, etc.) that belong to a connected
  bank
- `transactions` — one row per transaction, linked to which account it came from and (optionally)
  which category you assigned it

`categories` and `plaid_items` have a `user_id` column directly. `plaid_accounts` and
`transactions` don't repeat it -- their owner is found by following the chain down to `plaid_items`
instead (e.g. a transaction's owner is whoever owns the `plaid_items` row its account belongs to).
Every query that lists or edits this data filters (or double-checks ownership) using that chain, so
one user's data is never visible or editable by another.

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
| `AUTH_SECRET` | Used to encrypt login session cookies |

See `.env.example` for the template; real values go in `.env.local` (which is excluded from git).
Production values for these same variables live in Vercel's project settings instead, added via
`vercel env add` -- see DECISIONS.md for why they're stored as "Non-sensitive" there rather than
Vercel's more locked-down "Sensitive" type, and `.env.production.local` (also gitignored, never
committed) for the one local copy of the production database URL, used only to run migrations
against it directly from your machine.

## Deployment

The app is live at **https://j-hub-lippy-industries.vercel.app**, deployed to Vercel (project
`j-hub` under the `lippy-industries` account) with its database on Neon. Pushing to `main` on
GitHub automatically triggers a new deploy -- there's no separate manual step.

When the database's shape changes (`src/db/schema.ts` edited, a new migration generated), that
migration also has to be applied to the *production* database separately from your local one:

```
PROD_DB_URL="$(grep '^DATABASE_URL=' .env.production.local | cut -d= -f2-)"
DATABASE_URL="$PROD_DB_URL" npx drizzle-kit migrate
```

(Extracted this way rather than just `source .env.production.local` because the connection string
contains an `&` character, which a shell interprets as "run this in the background" unless handled
carefully -- that mistake silently pointed an earlier migration at the wrong database.)

Vercel's "Deployment Protection" (an SSO wall Vercel puts in front of the default `*.vercel.app`
domain) is turned off for this project, since it would otherwise block Plaid's webhook -- and you --
from ever reaching the app. This app's own Auth.js login is what actually protects account and
financial data now.

## Not yet built
- The Plaid webhook + push notification delivery described above (the original goal of this
  feature — the manual sync button is a placeholder for it)
- Todos/scheduling and any other planned productivity-hub features beyond the financial tracking
- Any way to reset a forgotten password (there's no "forgot password" email flow yet -- losing your
  password currently means losing access)
