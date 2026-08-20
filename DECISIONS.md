# Decisions

A running log of the significant choices made while building this app, and why. Entries are never
rewritten or deleted, even once something changes — a later decision that changes an earlier one
gets its own new entry instead, so the history stays intact. For what the app looks like *today*
(not the history of how it got there), see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 2026-08-19 — Build it as an installable web app (PWA) first

**Decision:** Build JHub as a "Progressive Web App" (PWA) — a website that can also be installed
like an app, with its own icon and window — rather than a native iOS/Android app or a
desktop-only app. Going into an actual app store is a possible later step, not something needed
right away.

**Why:** This gets something usable in a browser immediately, without going through Apple's/
Google's app store review process up front. A PWA can be adapted toward app-store distribution
later if that's ever wanted, without having to start over.

**Alternatives considered:** A desktop-only app (using a toolkit like Electron or Tauri); a
terminal-based tool.

---

## 2026-08-19 — TypeScript everywhere

**Decision:** Use TypeScript (JavaScript with type-checking added, so mismatched or missing data
gets caught while writing the code instead of when the app is running) for both the parts that
run in the browser and the parts that run on the server, in one shared project.

**Why:** This is a one-person, long-term project. Using a single language everywhere means the
browser code and server code can share the same type definitions (so, for example, if a
transaction's shape changes, both sides notice immediately), and there's only one set of tools to
keep up with, instead of two separate ecosystems to maintain in parallel.

**Alternatives considered:** A Python backend (using FastAPI) with a TypeScript frontend — Python
has stronger data/number-crunching libraries and works fine with Plaid too, but it would mean two
separate toolchains, no automatic type-sharing between them, and two separate things to deploy
instead of one. Skipped since there's no current need for heavy data analysis, and Python isn't
already a strength here.

---

## 2026-08-19 — One combined app instead of separate frontend and backend

**Decision:** Run the browser-facing pages and the server-side logic (API endpoints, database
access) as a single Next.js project that gets deployed as one unit, instead of two separate
projects/services.

**Why:** Simpler to manage for a solo project — one codebase, one deployment process. This can
still be split into a separate backend later if the app grows enough to need it; nothing here
rules that out.

**Alternatives considered:** A fully separate backend service (e.g. Node.js with Express) from day
one — cleaner separation, but more setup than is currently useful.

---

## 2026-08-19 — PostgreSQL as the database

**Decision:** Use PostgreSQL ("Postgres" for short) to store all persistent data.

**Why:** Postgres is a "relational" database — it's good at keeping related pieces of data
consistent with each other (e.g. making sure a transaction can't point at a category that doesn't
exist). That matters for financial data, and it'll handle the planned todo/scheduling data just as
well.

---

## 2026-08-19 — Drizzle over Prisma (for talking to the database)

**Decision:** Use Drizzle as the "ORM" — a library that lets the app describe database tables and
run queries using TypeScript, instead of writing raw SQL (the database's own query language) by
hand everywhere.

**Why:** Drizzle stays close to how SQL actually works under the hood, which makes it easier to
know exactly what it's doing, and it gives strong autocomplete/error-catching in TypeScript. That
fit for a project meant to be understood and hand-extended over time, rather than one leaning on a
tool that hides more of what's happening.

**Alternatives considered:** Prisma — a more full-featured, polished alternative with excellent
documentation and migration tooling, but it runs a heavier background process and is less
transparent about the actual SQL it generates.

---

## 2026-08-19 — Railway for hosting

**Decision:** Deploy the app and its database together on Railway (a cloud hosting service).

**Why:** Simple to set up, one dashboard covers both the app and the database, a generous free
tier, and easy management of secrets/environment variables — a good fit for a solo project that
doesn't need deep infrastructure control.

**Alternatives considered:** Vercel (made by the creators of Next.js, so it has the smoothest
experience specifically for Next.js) paired with Neon for the database — but that means two
separate dashboards to manage. Also considered Fly.io, which offers more low-level control but
more setup/maintenance than wanted right now.

---

## 2026-08-19 — Auth.js over Clerk (for login)

**Decision:** Use Auth.js (also known as NextAuth) to handle login once that gets built — it
hasn't been implemented yet as of this entry.

**Why:** It's free, open-source, self-hosted (runs as part of this app rather than depending on
someone else's servers), and built specifically to work with Next.js — no ongoing cost or reliance
on a third-party company.

**Alternatives considered:** Clerk — a hosted login service with a more polished, ready-made UI out
of the box, but it's a dependency on an outside company and can cost money as usage grows.

**Related:** the simplest possible option — a single hardcoded password with no real login
system — was on the table given this app currently has just one user, but a full login system was
chosen instead, likely because it leaves room for things like multiple users or social login later.

---

## 2026-08-19 — Plaid for bank transaction data

**Decision:** Use Plaid — a service that securely connects to a bank on the app's behalf and hands
back transaction data — instead of reading bank alert emails or typing transactions in by hand.

**Why:** It's the most reliable, structured way to get transaction data automatically, and it
supports "webhooks" (a way for Plaid to automatically notify our server the moment something
happens, rather than our server having to keep asking) — which lines up directly with the goal of
"notify me the moment I make a purchase."

**Alternatives considered:** Reading the transaction alert emails/texts banks already send (free,
but fragile — it silently breaks if the bank changes its email format); typing transactions in
manually (simplest and most private, but defeats the point of getting an automatic notification).

**Tradeoff accepted:** this adds a dependency on an outside company with access to bank-level data.
The credentials Plaid gives us for each bank connection (see `plaid_items.accessToken` in the
database) have to be treated like a password and kept secret.

---

## 2026-08-19 — A hand-written service worker instead of a library (Serwist)

**Decision:** Write `public/sw.js` (the "service worker" — a script the browser keeps running in
the background even when the app isn't open, which is what makes offline behavior and push
notifications possible) by hand, rather than using a library that generates one automatically.

**Why:** Push notifications need custom code no matter what (there's no way around writing that
part by hand), so a library's main benefit — automatically saving copies of every page for offline
use, with careful versioning — wasn't worth the extra dependency and build complexity yet. Keeping
this file simple enough to read start-to-finish mattered more at this stage.

**Alternatives considered:** Serwist (the actively maintained successor to a popular older library
called next-pwa) — gives much more robust offline support, but adds more moving parts than needed
right now. Worth reconsidering if real offline browsing (not just installing the app and getting
notifications) becomes an actual goal.

---

## 2026-08-19 — A local database running in Docker for development

**Decision:** Run Postgres locally inside Docker (a tool that runs an isolated copy of a program on
your own machine, so you don't have to install Postgres directly) while developing, kept completely
separate from the real Postgres database that'll run on Railway in production.

**Why:** It's fast, free, works without an internet connection, and guarantees that testing/
development can never accidentally touch real data.

**Alternatives considered:** Connecting straight to a cloud Postgres database on Railway even
during development — no need to install Docker, but it ties everyday development to a live cloud
database and would've required setting up Railway before any local development could even begin.

---

## 2026-08-19 — A manual "sync" button instead of a live webhook, for now

**Decision:** Build the Plaid transaction pipeline with a manually-triggered "Sync transactions"
button, instead of the real-time webhook (Plaid automatically notifying us) that's the eventual
goal — meaning push notifications aren't wired up yet either.

**Why:** Plaid's webhook needs a real, public web address to send its notification to — something
like `https://jhub.example.com`, not `localhost`, which only exists on this one machine. Rather
than set up a way to expose this machine to the internet (a "tunnel") before even confirming the
core pipeline worked, the connect → store → fetch → categorize flow was built and tested first
against Plaid's sandbox (a fake-data testing environment Plaid provides).

**Alternatives considered:** Setting up a tunnel (using a tool like ngrok or Cloudflare Tunnel)
immediately, to build the real webhook and push-notification flow end-to-end from the very start —
more setup work upfront, and puts off validating that the basic pipeline even works.

**Follow-up:** real-time notifications still need to be built — either via a tunnel for continued
local testing, or once the app is actually deployed to Railway and has a real public web address.

---

## 2026-08-19 — No `users` table yet; the app only supports one person for now

**Decision:** The database tables added so far for Plaid (`plaid_items`, `plaid_accounts`,
`transactions`, `categories`) don't have a `users` table or a `user_id` column linking rows to a
specific person.

**Why:** Auth.js (the login system planned for later, not yet built) expects its own specific
`users` table shape when it gets set up. Building a throwaway version of that table now risked it
conflicting with what Auth.js actually needs later. Since the app is explicitly single-user for
now anyway, it was safer to wait than to guess.

**Follow-up:** once Auth.js gets wired up, its required tables get added, plus a `user_id` column
on the Plaid-related tables, through a new migration (a tracked, versioned change to the
database's structure).

---

## 2026-08-20 — Auth.js implemented: email+password, JWT sessions, signup page included

**Decision:** Follow-up to the entry above -- login is now built. It uses Auth.js's "Credentials"
provider (a plain email+password form, not social login), "JWT" sessions (login state stored in an
encrypted browser cookie rather than a database table), and includes a public signup page rather
than seeding one single account by script.

**Why:** Email+password needs no outside service (no email-sending setup, no Google Cloud Console
app registration) and is the simplest to test locally. JWT sessions need no extra database table
and are simpler to wire up; the tradeoff accepted is that there's no way to force one specific
session to log out early other than changing the account's password. The signup page was a
deliberate choice over a single hand-seeded account (the safer default for a personal single-user
app) -- since the app is now open to being used by more than one person, categories and bank
connections were also changed to be scoped per-user rather than shared globally (see the
`user_id` columns added to `categories` and `plaid_items` in this same change).

**Alternatives considered:** Magic-link (passwordless) email login -- no password to manage, but
needs an email-sending service (like Resend) configured even just for local testing. Google
OAuth sign-in -- very secure, but needs a Google Cloud Console app set up first. Database sessions
instead of JWT -- more setup (a sessions table) but allows revoking one session directly, generally
considered more secure for sensitive data; skipped for now given the added setup. No public signup
page (just one script-seeded account) -- safer default for a single-user app, but not chosen since
multi-user use is now on the table.

**Follow-up:** there's no "forgot password" flow yet -- losing your password currently means losing
access to your account. No email-sending service is configured, which is what a reset flow would need.

---

## 2026-08-20 — `proxy.ts`, not `middleware.ts`

**Decision:** The file that protects pages by redirecting signed-out visitors to `/login` is named
`src/proxy.ts`, using an exported function named `proxy` -- not the `middleware.ts` name/convention
that's standard in most Next.js tutorials and training material.

**Why:** This isn't really a tradeoff decision so much as a note for later: this specific version of
Next.js (16) renamed that file convention from `middleware` to `proxy` (the docs bundled in this
project, at `node_modules/next/dist/docs/`, explain the reasoning -- avoiding confusion with
Express.js's unrelated concept of "middleware"). Using the old `middleware.ts` name still mostly
works but prints a deprecation warning during build. Worth remembering if this ever gets confusing
compared to outside documentation/tutorials that still say `middleware.ts`.
