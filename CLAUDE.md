# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Two other docs in this repo are more authoritative than this file for anything beyond commands and
orientation, and are meant to be kept current as the app changes:
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — living description of the current stack, every file's
  purpose, and how data flows through the app (Plaid sync, push notifications, auth, deployment).
- **[DECISIONS.md](DECISIONS.md)** — append-only log of *why* each significant technical choice was
  made, including several non-obvious gotchas hit while building this.

Read both before making an architectural change; update ARCHITECTURE.md (and append to DECISIONS.md
for anything with real tradeoffs) in the same commit as any change that adds a new moving part, new
data flow, or new directory convention.

## Commands

```
docker compose up -d          # start local Postgres (required before npm run dev)
npm run dev                   # dev server (Turbopack)
npm run build / npm run start # production build / run
npm run lint                  # ESLint

npm run db:generate           # generate a migration from src/db/schema.ts changes
npm run db:migrate            # apply pending migrations (local DB, via .env.local)
npm run db:studio             # visual DB browser
npm run db:seed -- you@example.com   # (re-)add default categories to one existing account

node scripts/generate-icons.mjs      # regenerate placeholder PWA icons
```

There is no test suite in this repo (no test script or framework configured).

**Running a migration against the production database** (Neon) needs care: `.env.production.local`
holds its connection string, but that string contains an `&` character that a plain `source
.env.production.local` will misinterpret as a shell background-job operator, silently truncating it.
Extract it safely instead:
```
PROD_DB_URL="$(grep '^DATABASE_URL=' .env.production.local | cut -d= -f2-)"
DATABASE_URL="$PROD_DB_URL" npx drizzle-kit migrate
```

Local dev requires Docker Desktop running (`docker compose up -d`) and `.env.local` populated from
`.env.example` (Postgres URL, Plaid sandbox keys, `AUTH_SECRET`, VAPID keys).

## Architecture

Next.js App Router, TypeScript end-to-end, one unified app (no separate backend service). Full
detail in ARCHITECTURE.md; the load-bearing points for making changes correctly:

- **Database**: Drizzle ORM + Postgres. `src/db/schema.ts` is the single source of truth for table
  shape; migrations live in `drizzle/` and are generated, never hand-edited. Local dev uses a
  Dockerized Postgres; production uses Neon.
- **Auth**: Auth.js, Credentials provider (email+password), JWT sessions. `src/proxy.ts` — **not**
  `middleware.ts` (this Next.js version renamed that file convention) — redirects signed-out
  visitors away from pages. It is *not* the only protection: every route under `src/app/api/plaid/`
  and `src/app/api/transactions/` also checks `auth()` itself and returns its own 401, per Next.js's
  own guidance that a proxy matcher change could silently stop covering a route.
- **Lazy client initialization**: `src/db/index.ts`, `src/lib/plaid.ts`, and `src/lib/web-push.ts`
  all connect on first real use (via a `Proxy` wrapper) rather than the moment the module is
  imported. This is required, not stylistic — Vercel doesn't expose the relevant secrets during the
  build step, so eager top-level initialization breaks the build. Follow this same pattern for any
  new module that reads a secret at load time.
- **Plaid integration**: `POST /api/plaid/link-token` → Plaid Link popup → `POST
  /api/plaid/exchange-token` (stores the connection, then explicitly re-confirms the webhook via
  `itemWebhookUpdate` — connections can silently end up with no webhook attached otherwise) →
  transactions arrive either via `POST /api/plaid/webhook` (real-time, Plaid-initiated) or the
  manual `POST /api/plaid/sync` button. Both call the same shared sync logic in
  `src/lib/plaid-sync.ts` — don't duplicate that logic in a route file.
- **Push notifications**: `push_subscriptions` table holds Web Push subscriptions (VAPID-based, no
  third-party push service). `src/lib/plaid-webhook-verify.ts` must successfully verify Plaid's
  signed JWT before a webhook request is trusted — never bypass this. `public/sw.js` is the service
  worker that actually receives and displays notifications.
- **Multi-tenancy**: `categories` and `plaid_items` carry `user_id` directly; `plaid_accounts` and
  `transactions` don't repeat it — ownership is found by joining down to `plaid_items`. Every query
  that touches this data must filter (or verify ownership) through that chain.
- **Deployment**: Vercel (app) + Neon (production Postgres), auto-deploys on push to `main`. Vercel
  secrets are stored as "Non-sensitive" rather than "Sensitive" — the latter type was empirically
  found not to be readable by the running function at all in this project's setup, not just during
  the build (see DECISIONS.md for how this was diagnosed).

## Security — this repo is public

`lipschultzjacob/JHub` is a **public** GitHub repository. Every commit is visible to anyone,
immediately, forever (even a later "fix" commit doesn't erase a secret from history — see the
`.env.production.local` note below). Treat that as the operating assumption for every change, not
just a one-time check:

- **Never commit** `.env.local`, `.env.production.local`, or any file containing a real value for
  `DATABASE_URL`, `PLAID_CLIENT_ID`/`PLAID_SECRET`, `AUTH_SECRET`, `VAPID_PRIVATE_KEY`, or any future
  secret. Only `.env.example` (placeholders/empty values only) belongs in git. Don't add a new secret
  to `.gitignore`'s allowlist without a specific reason.
- **Never paste a real secret value into a committed file** — not in code, not in ARCHITECTURE.md/
  DECISIONS.md/README.md/CLAUDE.md, not in a code comment "for reference," not in a commit message.
  Reference variable *names*, never values.
- **Before every commit**, actually look at `git status` and `git diff` for what's about to be
  staged — don't `git add -A` on autopilot. If a broad add pulls in something unexpected (a stray
  `.env*` file, a debug script with a hardcoded token, etc.), unstage it rather than committing and
  fixing later.
- **If a secret needs to reach the running app**, it goes through an environment variable (local:
  `.env.local`; production: `vercel env add`), never hardcoded in source, and never requested from
  the user as chat text — have them edit the gitignored env file directly instead.
- **If ever unsure whether something already leaked**, don't just check the current tree — search
  full history, since a value can still be recovered from an old commit even after being "removed."
  `git log --all -S"<the specific value>"` (not a full-text `grep`) finds every commit that ever
  introduced or removed that exact string, which is what actually answers the question.

## Conventions specific to this repo

- Comments and documentation (including chat explanations of changes) should spell out unfamiliar
  technical terms in plain language rather than assuming background knowledge — this codebase is
  being used as a learning vehicle, not just a deliverable. Every function gets at least a short
  comment describing what it does.
- Don't make architecture or design decisions unilaterally — this is a long-lived personal project
  the user intends to keep extending, and they've asked to be consulted on choices with real
  tradeoffs rather than have them decided silently.
