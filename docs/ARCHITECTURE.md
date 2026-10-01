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
| Styling        | Tailwind CSS — write styling directly as class names on elements instead of separate `.css` files. UI must follow the design system in `docs/design-system.md`/`docs/design/` (tokens live in `src/app/globals.css`, each with a Light and a Dark value that follows the phone's setting) |
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
│   │   ├── layout.tsx            the root page shell every page renders inside (page title, iPhone Home Screen settings, edge-to-edge `viewportFit: "cover"`, per-mode status-bar colors, registers the service worker below). Uses Apple's system font, so nothing is downloaded
│   │   ├── manifest.ts            describes the app for "install as an app" purposes, auto-served at /manifest.webmanifest
│   │   ├── (app)/                a "route group" -- the "(app)" folder name is invisible in the URL, it exists only so these pages can share one extra layout.tsx (the bottom tab bar) without login/signup getting it too
│   │   │   ├── layout.tsx          adds the iPhone-style bottom tab bar (`TabBar`) + content wrapper around every page below, as one centered phone-width column (430px max) with safe-area padding for the notch, and bottom padding so the last row can scroll up above the tab bar
│   │   │   ├── page.tsx             the Overview screen, served at "/": loads your unsorted transactions (categoryId IS NULL, newest first) and your categories ranked most-used first, and hands them to `OverviewDeck`; or shows an empty state instead: "No Bank Connected" (→ Settings) or "No Categories Yet" (→ Categories)
│   │   │   ├── categories/
│   │   │   │   ├── page.tsx          the Categories list, served at "/categories": loads your categories with their transaction counts and hands them to `CategoriesView` (large title with a "+" that opens the New Category sheet -- the only place categories get created -- a row per category opening its screen, swipe left to delete after an "are you sure?", and a "No Categories" empty state)
│   │   │   │   └── [id]/page.tsx     one category's screen ("/categories/3"): verifies the category belongs to the signed-in user (else 404), then shows a "‹ Categories" nav bar with a Rename button, and its transactions as list rows (`TransactionListRow`), each with a dropdown to re-sort it; "No Transactions" empty state
│   │   │   └── settings/
│   │   │       ├── page.tsx          the Settings screen, served at "/settings", as iOS grouped sections: Connected Banks (a row per bank, opening its screen, plus "Connect a Bank"), Sync Now, Notifications (on/off switch for this device), Account (your email + Sign Out, which confirms first)
│   │   │       └── banks/[id]/page.tsx  one bank's screen ("/settings/banks/3"): verifies the bank belongs to the signed-in user (else 404), then shows a "‹ Settings" nav bar, the bank's accounts (name, "Checking ••0000"), when it was connected, and a red Disconnect Bank row
│   │   ├── login/page.tsx          the Log In screen (outside the "(app)" group -- no tab bar): app icon + "JHub", Email/Password as an iOS grouped section (iCloud Keychain autofill), full-width Log In button, link to Sign Up
│   │   ├── signup/page.tsx         the Sign Up screen (same look): Email, Password, Confirm Password (must match), creates the account then logs straight in
│   │   └── api/                  backend endpoints the frontend calls (no separate backend project needed)
│   │       ├── auth/
│   │       │   ├── [...nextauth]/ Auth.js's own required routes (login, logout, session check, etc.)
│   │       │   └── signup/        creates a new account (Auth.js only handles logging in, not registration)
│   │       ├── plaid/
│   │       │   ├── link-token/    creates a short-lived token so the browser can open Plaid's "connect your bank" popup
│   │       │   ├── exchange-token/ turns that popup's result into a real, long-lived connection to your bank
│   │       │   ├── items/[id]/    DELETE disconnects one bank: revokes it at Plaid (itemRemove), then deletes the local row (which cascades to its accounts and transactions)
│   │       │   ├── sync/          fetches new transactions from Plaid (manual fallback -- the webhook below does this automatically)
│   │       │   └── webhook/       Plaid calls this automatically the moment a new transaction happens
│   │       ├── push/
│   │       │   └── subscribe/     saves/removes a browser's push notification subscription
│   │       ├── categories/        POST creates a category for you (same name rules as rename below)
│   │       ├── categories/[id]/   PATCH renames one category (trimmed, 1-40 chars, no case-insensitive duplicate among your own categories; 404 if it isn't yours); DELETE removes it (its transactions become unsorted, via the schema's "on delete set null")
│   │       └── transactions/[id]/ lets the frontend set which category a transaction belongs to
│   ├── components/               Interactive pieces of the UI (buttons, dropdowns) that run in the browser
│   │   ├── service-worker-registration.tsx
│   │   ├── auth-session-provider.tsx  makes the current login session available throughout the app
│   │   ├── touch-active-states.tsx  adds the empty touch listener iPhone Safari needs before it shows pressed-state (`active:`) styles; rendered once in the root layout
│   │   ├── tab-bar.tsx            the bottom tab bar (Overview, Categories, Settings) on every signed-in page: Lucide icon + label per tab, current one tinted (a Client Component, since only the browser knows the current URL)
│   │   ├── large-title.tsx        a screen's 34px "Large Title" heading, iOS-style
│   │   ├── grouped-list.tsx       the iOS grouped inset list: `ListSection` (a rounded block of rows with optional header/footer) and `ListRow` (44px+ row: title, subtitle, value, accessory, chevron; a link or button when given href/onClick)
│   │   ├── swipe-row.tsx          `SwipeToDelete`: wraps a ListRow so swiping it left grows a red trash-can panel; letting go past the threshold calls onDelete (which opens the ConfirmAlert), otherwise it springs back; vertical scrolling untouched
│   │   ├── confirm-alert.tsx      the centered iOS "are you sure?" alert (title, message, Cancel + red confirm side by side) used before destructive actions
│   │   ├── sheet.tsx              the iOS sheet that slides up for creating/editing (Cancel / title / Save bar, form inside; leave out onSave for a pick-from-a-list sheet with no Save); stays above the iPhone keyboard; `primeKeyboard()` lets the opening tap bring the keyboard up
│   │   ├── overlay.tsx            shared plumbing for sheet.tsx and confirm-alert.tsx: appear/disappear animation timing, page scroll lock, Escape to close, keyboard height, and a Portal that renders into <body>
│   │   ├── recipes.ts             shared Tailwind class-name strings (buttons, inputs, cards) from the design system, so components don't each repeat -- or drift out of sync with -- the same long class string. Not a component; plain exported strings
│   │   ├── sort-deck.tsx          Overview's card deck: unsorted transactions as a stack of cards (swipe left = next, right = back); hold the top card and the screen becomes a 3x2 grid of categories (top 5 most-used + "More…", ✕ in the middle cancels); drop to sort; "Sorted into … · Undo" banner
│   │   ├── overview-deck.tsx      connects SortDeck to the server (PATCH /api/transactions/[id]; null on Undo), shows "All Caught Up", and opens on the card from a notification link (/#transaction-<id>)
│   │   ├── sign-out-row.tsx       the red Sign Out row on Settings: asks "Sign Out?" first, then turns off push notifications on this device before signing out
│   │   ├── disconnect-bank-row.tsx  the red Disconnect Bank row on a bank's screen: asks "Disconnect X?" (its transactions get deleted), calls DELETE /api/plaid/items/[id], then returns to Settings
│   │   ├── connect-bank-row.tsx   the blue "Connect a Bank" row on Settings: fetches a link token, then opens Plaid's popup
│   │   ├── sync-section.tsx       the "Sync Now" section on Settings: manual sync, with the result shown under it
│   │   ├── notifications-section.tsx  the Notifications section on Settings: an iOS switch for this device (grayed out, with the reason, if this browser can't do push, has blocked it, or is the dev build)
│   │   ├── switch.tsx             the iOS on/off switch, for a ListRow's accessory slot
│   │   ├── nav-bar.tsx            the top bar of a pushed screen: tinted "‹ Back" link + centered title
│   │   ├── categories-view.tsx    the interactive part of the Categories list: "+" button, category rows with swipe-to-delete + confirm alert, New Category sheet, empty state
│   │   ├── category-name-sheet.tsx  the sheet for typing a category name, shared by New Category and Rename (shows the server's error, e.g. a duplicate name, inside the sheet)
│   │   ├── rename-category-button.tsx  the "Rename" button in a category screen's nav bar; opens the name sheet prefilled
│   │   ├── transaction-list-row.tsx  one transaction as an iOS list row: merchant, "Sep 12 · Checking", amount (money in green with "+"), and its category as a blue dropdown
│   │   ├── empty-state.tsx        the iOS-style empty screen: big gray icon, title, one sentence, optional blue button
│   │   ├── auth-form.tsx          shared pieces of the Log In / Sign Up screens: AuthScreen (icon + title layout), AuthFields/AuthField (grouped input rows), AuthButton
│   │   └── category-select.tsx    the category dropdown; saves the choice straight away (PATCH /api/transactions/[id]); takes a className for the in-row look
│   ├── db/
│   │   ├── schema.ts              defines the shape of every database table in TypeScript — this file is the single source of truth for what the database looks like
│   │   └── index.ts               sets up the connection to the database that the rest of the app uses
│   ├── lib/
│   │   ├── plaid.ts               configuration for talking to Plaid's API
│   │   ├── plaid-sync.ts          the actual "fetch new transactions and save them" logic, shared by the manual sync button and the webhook
│   │   ├── plaid-webhook-verify.ts confirms an incoming webhook request genuinely came from Plaid
│   │   ├── web-push.ts            sends a push notification to one saved subscription
│   │   ├── format-date.ts         formats dates the iOS way for lists ("Sep 12, 2026")
│   │   ├── format-money.ts        formats a transaction's amount ("$12.34", money in as "+$500.00") and date ("Sep 12")
│   │   ├── push-client.ts         browser-only helpers to turn this device's push notifications on/off (permission prompt, Web Push subscribe/unsubscribe, saving to /api/push/subscribe); used by notifications-section.tsx and sign-out-row.tsx
│   │   ├── category-name.ts       server-only naming rules shared by category create and rename: trim + length check, and the case-insensitive "you already have that name" check
│   │   ├── crypto.ts              encrypts/decrypts the Plaid access_token before it's stored (see Database below)
│   │   └── rate-limit.ts          blocks repeated login/signup attempts past a threshold (see Login below)
│   ├── types/
│   │   └── next-auth.d.ts         small type addition so TypeScript knows about the user ID we attach to sessions
│   ├── auth.ts                    Auth.js configuration: how login works, what a session contains
│   └── proxy.ts                   runs before every page request; redirects signed-out visitors to /login (see "Login" below)
├── drizzle/                      Auto-generated files describing each change ever made to the database's structure (a "migration" — see Database section). Don't hand-edit these; they're regenerated from schema.ts
├── scripts/
│   └── generate-icons.mjs        regenerates the app's icon images (currently simple placeholders — rerun this once real branding/logo exists)
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
hold on-screen state, or use browser-only features. Most of `src/components/` is a Client Component
for exactly that reason: registering the service worker, opening Plaid's popup, saving a dropdown
change. The exceptions are the presentation pieces with no interactivity of their own --
`large-title.tsx`, `grouped-list.tsx`, `nav-bar.tsx`, `empty-state.tsx` and the transaction rows -- which work inside either kind,
and `recipes.ts` (not a component at all, just shared Tailwind class-name strings importable from
either kind).

### The "installable app" layer (PWA)
"PWA" stands for Progressive Web App — a website that can be installed like a real app (icon on your
home screen, opens in its own window, works partly offline).
- `src/app/manifest.ts` — tells the browser what to call the app and which icon/colors to use when
  it's installed. Its colors can't vary by Light/Dark, so they use the Light background; on an
  iPhone, the per-mode `themeColor` and the `appleWebApp` settings in `src/app/layout.tsx` are
  what count.
- `src/app/globals.css` also holds the iPhone basics that apply to every page: the `pt-safe` /
  `pb-safe` / `px-safe` padding helpers (they keep content out from under the notch, status bar and
  home indicator, using the `env(safe-area-inset-*)` values the browser reports), no gray tap
  flash, no double-tap zoom, and 17px text in inputs (under 16px makes iPhone Safari zoom in when
  a field is tapped).
- `public/sw.js` — the "service worker": a small script the browser keeps running in the background,
  separate from any open tab, even after you close the app. This is what makes offline behavior and
  push notifications possible — without it, neither would work. It's registered (turned on) by
  `src/components/service-worker-registration.tsx`, but only in the production build; during
  development it's deliberately turned off, because a service worker's caching would otherwise make
  it look like your code changes aren't taking effect while you're actively editing. Right now it:
  saves a copy of the home page for offline use, prefers fetching fresh data over the network but
  falls back to that saved copy if you're offline, and (see "Push notifications" below) actually
  receives and displays push notifications, opening the app to the relevant transaction when tapped.

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
that creates the account (with no categories -- you create your own on the Categories screen) before immediately logging it in.

Sessions use the "JWT" strategy: your logged-in state lives in an encrypted browser cookie rather
than a database row, which is simpler to set up but means there's no way to remotely force one
specific session to log out (changing your password is the only way to invalidate a session early).

Both logging in and signing up are rate-limited (`src/lib/rate-limit.ts`) to block repeated
automated attempts: 5 attempts per 15 minutes, tracked in the `login_attempts` table (see Database
below) since there's no Redis/in-memory store in this stack that would survive between serverless
requests. Login is limited per email address (protects one account regardless of where the attempts
come from); signup is limited per IP address (there's no real account to key on yet -- this stops a
script from mass-creating fake accounts). A successful login clears that email's count so a couple
of earlier typos don't count against you later.

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
- `categories` — the budgeting categories you sort transactions into, one set per user. New
  accounts start with none; every category is created by the user on the Categories screen
  (`POST /api/categories`)
- `plaid_items` — one row per bank a user has connected; holds the credential Plaid gave us for
  that connection (encrypted -- see the Plaid section below) and a bookmark ("cursor," see below) of
  how far we've synced
- `plaid_accounts` — the individual accounts (checking, savings, etc.) that belong to a connected
  bank
- `transactions` — one row per transaction, linked to which account it came from and (optionally)
  which category you assigned it
- `push_subscriptions` — one row per browser/device that's agreed to receive push notifications for
  a user (someone could have several: phone, laptop, ...)
- `login_attempts` — recent login/signup attempts, used to block a burst of them (see Login above)

`categories`, `plaid_items`, and `push_subscriptions` have a `user_id` column directly. `plaid_accounts` and
`transactions` don't repeat it -- their owner is found by following the chain down to `plaid_items`
instead (e.g. a transaction's owner is whoever owns the `plaid_items` row its account belongs to).
Every query that lists or edits this data filters (or double-checks ownership) using that chain, so
one user's data is never visible or editable by another.

### How the Plaid (bank) integration works, step by step
1. The frontend asks our own backend for a "link token" (`POST /api/plaid/link-token`) — a
   short-lived pass that lets the browser open Plaid's connection popup.
2. `ConnectBankRow` (the "Connect a Bank" row on Settings) opens that popup. You pick your bank and log in *inside Plaid's popup* — your
   bank password is never seen by this app.
3. On success, Plaid hands the browser a `public_token`. The frontend sends that to
   `POST /api/plaid/exchange-token`, which trades it, on the server, for the real long-lived
   connection credential (the `access_token`) — this step has to happen on the server because that
   credential is a secret that should never reach the browser. Before it's saved to `plaid_items`,
   it's encrypted (`src/lib/crypto.ts`, AES-256-GCM, keyed by the `ENCRYPTION_KEY` environment
   variable) -- this app only ever requests Plaid's read-only `Transactions` product, so this
   credential can't move money either way, but it can read your real transaction history, so a
   database leak alone shouldn't be enough to expose that too. It's decrypted again right before
   each use (fetching accounts here, syncing transactions in step 4). The bank's individual accounts
   are fetched and saved to `plaid_accounts`.
4. From here, new transactions get fetched one of two ways. Automatically: Plaid calls
   `POST /api/plaid/webhook` itself the instant something changes (see "Push notifications" below).
   Manually: clicking "Sync transactions" calls `POST /api/plaid/sync` and does the same fetch on
   demand -- useful for testing, or as a fallback if a webhook notification is ever missed. Both
   routes call the same shared function (`syncPlaidItem` in `src/lib/plaid-sync.ts`) to actually do
   the work, so the fetching logic itself only exists in one place. That function asks Plaid for
   anything new since last time using a "cursor" — think of it like a bookmark: each response comes
   with a new cursor to save and send back next time, so Plaid only has to tell us what changed
   instead of resending everything. New/changed transactions are saved with an "upsert" (insert it
   if it's new, update it if it already exists) — and updating deliberately never overwrites a
   category you already picked by hand.
5. Disconnecting a bank (Settings → Disconnect) calls `DELETE /api/plaid/items/[id]`, which checks
   the item belongs to you, tells Plaid to revoke it (`itemRemove`), and only then deletes the local
   `plaid_items` row -- cascading to its accounts and all their transactions, categorized or not.
   If Plaid's call fails the local row is kept so you can retry (unless Plaid says the item is
   already gone, which counts as success).
6. The category dropdown on Overview and the category detail pages calls `PATCH /api/transactions/[id]` to save
   which category you picked.

### Push notifications
The actual "notify me the moment I spend money" feature. Three pieces:

1. **Registering with Plaid.** When a link token is created (step 1 above), it includes a `webhook`
   URL (only when `APP_URL` is configured -- see Environment variables) pointing at
   `POST /api/plaid/webhook`. Right after exchanging the token (step 3 above), that webhook is also
   explicitly (re-)confirmed via `itemWebhookUpdate` -- discovered the hard way during testing that
   a connection can silently end up with no webhook attached depending on exactly how it was
   created, with no error at connect time; it only shows up later as "notifications never arrive."
   Calling it again here is harmless if it was already set correctly.
2. **Subscribing this browser.** The Notifications switch on Settings (`NotificationsSection`,
   using the helpers in `src/lib/push-client.ts`) controls this device only. Turning it on asks the browser for
   notification permission, then uses the browser's own Web Push API to create a subscription (an
   address + two encryption keys unique to this browser). That gets saved via
   `POST /api/push/subscribe` into `push_subscriptions`. Someone can have several of these (phone,
   laptop, ...) since each browser subscribes independently. Opening Settings on an
   already-subscribed device quietly re-saves its subscription, so the server's record comes back
   if it was ever lost. Switching it off unsubscribes in the browser first, then removes the row via
   `DELETE /api/push/subscribe`; if that removal fails, the leftover row is harmless, because the
   next notification sent to it bounces (404/410) and step 3 deletes it. Signing out runs the same
   "turn off" first, so a signed-out browser stops receiving your notifications. The toggle only
   works in the production build -- in development there's no service worker (see above).
3. **Sending the notification.** When Plaid calls `POST /api/plaid/webhook`, that route first checks
   the request is genuinely from Plaid (`src/lib/plaid-webhook-verify.ts` verifies a signed token
   Plaid attaches to every webhook -- without this, anyone who found the URL could fake a "new
   transaction" message), then runs the same sync logic as the manual button, then sends a push
   notification (`src/lib/web-push.ts`, using the VAPID keys) to every one of that user's saved
   subscriptions. `public/sw.js`'s `push` handler is what actually displays it, and tapping it opens
   the app straight to that transaction on Overview (`/#transaction-<id>`, or just `/` for the combined "N new transactions" summary), where the card deck opens on that transaction's card to sort it --
   full in-notification category buttons were considered but skipped for now (see DECISIONS.md):
   browsers only allow ~2 actions directly on a notification, and iOS doesn't support them at all.

## Security headers
`next.config.ts` adds a few response headers to every page: `X-Frame-Options: DENY` (stops this app
from ever being embedded in another site's hidden iframe -- a "clickjacking" trick to get you to
click something you didn't mean to), plus `Referrer-Policy` and `X-Content-Type-Options` as standard,
low-cost hardening. None of these needed a real decision -- they're the boring, obvious defaults.

## Environment variables

"Environment variables" are settings/secrets kept outside the code (in a `.env.local` file that's
never committed to git), so things like passwords aren't stored in the codebase itself.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | How to connect to the Postgres database |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` | Credentials that prove to Plaid this app is allowed to use their API |
| `PLAID_ENV` | Which Plaid environment to talk to: `sandbox` (fake test data), `development`, or `production` (real banks) |
| `AUTH_SECRET` | Used to encrypt login session cookies |
| `ENCRYPTION_KEY` | Used to encrypt the Plaid `access_token` before it's stored in the database (`src/lib/crypto.ts`) -- a separate key from `AUTH_SECRET`, never reused |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push credentials -- prove notifications from this app are genuinely from this app. The public key is safe for the browser to see (hence `NEXT_PUBLIC_`); the private key is not |
| `APP_URL` | This app's real public web address, e.g. `https://j-hub-lippy-industries.vercel.app`. Used to tell Plaid where to send webhooks. Unset locally, since local dev has no public address for Plaid to reach |
| `DEV_ALLOWED_ORIGINS` | Development only. This computer's Wi-Fi address (e.g. `10.11.174.75`, comma-separate several), read by `next.config.ts`'s `allowedDevOrigins` so an iPhone on the same Wi-Fi can use the dev server at `http://<that address>:3000`. Without it, the dev server blocks the page's JavaScript for any address but localhost, so pages load but forms just reload. Changes with your network; never set in production |

See `.env.example` for the template; real values go in `.env.local` (which is excluded from git).
Production values for these same variables live in Vercel's project settings instead, added via
`vercel env add` -- see DECISIONS.md for why they're stored as "Non-sensitive" there rather than
Vercel's more locked-down "Sensitive" type, and `.env.production.local` (also gitignored, never
committed) for the one local copy of the production database URL, used only to run migrations
against it directly from your machine.

## Deployment

The app is live at **https://j-hub-lippy-industries.vercel.app**, deployed to Vercel (project
`j-hub` under the `lippy-industries` account) with its database on Neon. Pushing to `main` on
GitHub does *not* trigger a deploy -- Vercel's project settings have "Ignored Build Step" (Settings
→ Git) set to always skip, so every push just updates the repo. Deploying is a separate, manual
step: `npx vercel --prod`.

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
- In-notification quick-action category buttons (tapping a notification opens the app to
  categorize instead -- see "Push notifications" above)
- Any other planned productivity-hub features beyond the financial tracking (the to-do list was
  dropped -- see DECISIONS.md)
- Password change, email change, account deletion (Settings only has bank management, the notifications toggle, and sign-out)
- Any way to reset a forgotten password (there's no "forgot password" email flow yet -- losing your
  password currently means losing access)
- Bank connections made before this webhook-confirmation step existed don't get fixed
  retroactively -- only reconnecting (or a new connection) re-confirms the webhook
