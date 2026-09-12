# JHub

Personal productivity hub — starting with automatic bank transaction tracking (Plaid), expanding
into todos/scheduling and other productivity features over time.

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — living doc of how the app is built right now
- **[docs/DECISIONS.md](docs/DECISIONS.md)** — append-only log of why each architecture choice was made

## Prerequisites

- Node.js 22+
- Docker Desktop (for local Postgres)
- A [Plaid](https://dashboard.plaid.com) developer account (Trial plan, production environment — see
  docs/DECISIONS.md, 2026-09-12)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the env template and fill in real values:
   ```bash
   cp .env.example .env.local
   ```
   `DATABASE_URL` already matches `docker-compose.yml`'s credentials — no changes needed there for
   local dev. Fill in `PLAID_CLIENT_ID` and `PLAID_SECRET` from your Plaid dashboard, and set
   `PLAID_ENV=production`.

3. Start local Postgres:
   ```bash
   docker compose up -d
   ```

4. Run migrations and seed default categories:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Start the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Common commands

| Command | What it does |
|---------|---------------|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` / `npm run start` | Production build / run |
| `npm run lint` | Lint |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed default budgeting categories (idempotent) |
| `npm run db:studio` | Open Drizzle Studio (visual DB browser) |
| `node scripts/generate-icons.mjs` | Regenerate PWA icon PNGs |

## Testing the Plaid flow

Connect a real bank on the `/transactions` page via Plaid Link, then click "Sync transactions" to
pull in actual transaction data.
