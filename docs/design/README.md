# Handoff: JHub interface system

## Overview
A dark, casual visual system for JHub — the personal productivity hub in
`lipschultzjacob/JHub` (Next.js 16 App Router, React 19, Tailwind v4, Drizzle/Postgres).
It replaces the default Next.js scaffold styling with a deliberate system, and reframes the
product from "finance dashboard" toward "casual budgeter + to-do hub": the overview leads with
today's tasks and a queue of purchases waiting to be labeled, with money reduced to one quiet strip.

Seven screens are designed: Overview, Transactions, Transaction detail, Categories,
Connect-a-bank empty state, Login/Signup, Settings.

## About the design files
The files in this bundle are **design references written in plain HTML/CSS** — a prototype of the
intended look and behavior, not production code to paste in. The job is to **recreate these designs
inside JHub's existing environment**: React Server/Client Components under `src/app`, styled with
Tailwind v4 utilities reading from the theme in `src/app/globals.css`. Keep the repo's existing
architecture (server components query the DB directly; only interactive leaves are client
components). Take colors, type, spacing, radii and copy from this document — not from your own
defaults.

## Fidelity
**High fidelity.** Colors, type, spacing, radii and states are final and exact. Match them.
Layout should be reproduced faithfully but fluidly — see "Responsive behavior".

## Design origin
The system derives from the **Industry** design system (steel-blue accent, Barlow Condensed over
Barlow, modular grid, hairline-bordered wireframe objects), with two deliberate departures made by
the product owner:
1. **Dark ground** instead of Industry's light one — the ramp direction inverts (hovers step
   *lighter*, not darker).
2. **Rounded, not square** — Industry's square corners and "+" registration corner marks are
   dropped in favor of 12px radii and faint surface fills. Do not reintroduce square corners or
   corner marks.

---

## Design tokens

Drop `globals.css` from this bundle straight into `src/app/globals.css` — it defines every token
below as a Tailwind v4 `@theme` entry plus raw CSS variables. Never hard-code a hex or a px value
that a token already carries.

### Color

| Token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `#16171a` | Page ground |
| `--color-surface` | `#1e2024` | Raised surface (rarely needed — cards use a text-tint instead) |
| `--color-text` | `#e6e6ea` | Primary ink |
| `--color-accent` | `#94bce3` | The single accent — steel blue |
| `--color-divider` | `color-mix(in srgb, #e6e6ea 12%, transparent)` | Card borders, nav underline |

Accent ramp (OKLCH-derived, shared lightness scale):
`100 #eef6ff` · `200 #d6ebff` · `300 #b5d9fd` · `400 #94bce3` · `500 #749dc4` · `600 #597ea3` ·
`700 #416180` · `800 #2c455d` · `900 #1d2d3d`

Neutral ramp:
`100 #f5f5f8` · `200 #e7e7ea` · `300 #d4d4d7` · `400 #b7b7ba` · `500 #98989b` · `600 #7a7a7d` ·
`700 #5d5d60` · `800 #424244` · `900 #2b2b2d`

**Rules**
- One accent only. No greens, reds, or "success/danger" colors — including for money.
  Money out is plain ink; money in is the accent. That is the entire semantic palette.
- Text opacities are the workhorse. Standard steps, always as `color-mix` on `--color-text`:
  **100%** primary · **65%** body/secondary · **45%** meta and labels · **12%** borders ·
  **8%** row rules · **4-5%** surface fills and hovers.
- On this dark ground, interactive states step **lighter** along the ramp
  (`400 → 300` on hover, `→ 500` pressed).
- Accent-on-ground is ~3:1 — fine for large type, chrome and icons, not for paragraph text.
  Body copy stays in `--color-text` at 65%.

### Type

- **Headings**: Barlow Condensed 600, `line-height: 1.12`, `letter-spacing: -0.005em`
- **Body**: Barlow 400/500, `line-height: 1.6`
- Load both from Google Fonts via `next/font/google` and replace the Geist pair in
  `src/app/layout.tsx` (`--font-heading` / `--font-body`).

| Role | Size | Notes |
| --- | --- | --- |
| Screen title (h1) | 40px | Condensed, one per screen |
| Section (h2) | 32px | |
| h3 | 25px | |
| Card/panel heading (h4) | 20px | The workhorse heading |
| Body | 15px / 1.6 | |
| Secondary | 13-14px | 65% ink |
| Meta | 11px | 45% ink |
| Kicker | 11px | uppercase, `letter-spacing: 0.1em`, accent |
| Eyebrow / column label | 11px | uppercase, `0.1em`, 45% ink |

Every number (amounts, counts) uses `font-variant-numeric: tabular-nums`.
Large amounts use the **heading** font, not body.

### Spacing

A 0.85× scale: `--space-1: 3.4px` · `2: 6.8px` · `3: 10.2px` · `4: 13.6px` · `6: 20.4px` ·
`8: 27.2px`. Screen padding is `space-6 space-4`; card padding `space-4`; the gap between major
blocks is `space-6`.

### Radius

| Token | Value | Applies to |
| --- | --- | --- |
| `--soft` | `12px` | Cards, panels, page frame |
| `--soft-control` | `9px` | Buttons, inputs, selects, segmented control |
| pill | `999px` | Tags, progress bars |

### Elevation & motion

Shadows are almost never used — separation comes from the hairline border and the 4% fill.
When needed: `sm 0 1px 2px rgba(0,0,0,.45)` · `md 0 3px 10px rgba(0,0,0,.5)` ·
`lg 0 12px 32px rgba(0,0,0,.6)`.
Transitions: `140ms ease` on `background`, `border-color`, `color`. Nothing else animates.

### Focus

`:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }` on every
interactive element. Never leave the browser default.

---

## Components

Full CSS for each is in `industry.css` (the reference stylesheet); Tailwind-class recipes are in
`components.md`. Summary of the contract:

- **Card / panel** — 1px `--color-divider` border, `--soft` radius, background
  `color-mix(text 4%)`, padding `space-4`, `display:flex; flex-direction:column; gap:space-2`.
  An "attention" panel (the sort queue) keeps the same shape but takes an accent-tinted border:
  `color-mix(accent 40%)`.
- **Button** — `--soft-control` radius, 14px Barlow Condensed 600, padding `space-2` × `12px`.
  *Primary*: solid accent fill, `--color-bg` text; hover accent-300; active accent-500.
  *Secondary*: transparent, divider border; hover `text 7%`; active `text 14%`.
  *Ghost*: accent text, no border; hover `accent 10%`.
  Disabled: 45% opacity.
- **Input / select** — full width, min-height 36px, 14px, `text 5%` fill, divider border,
  `--soft-control` radius, accent caret. Hover lifts the border to `text 45%`; focus to accent.
  Selects use a custom CSS chevron (no native arrow).
- **Segmented control** — inline-flex of radio labels, divider border, `--soft-control` radius,
  overflow hidden, 1px divider between options; checked option is a solid accent fill with
  `--color-bg` text.
- **Tag** — pill, 11px, `3px 11px`. *Accent*: `accent 18%` fill, accent-300 text.
  *Neutral*: `text 10%` fill, neutral-300 text.
- **Nav** — single top bar, brand `JHUB` in Barlow Condensed 18px `0.04em`, links 14px inherit
  color, `aria-current="page"` and hover both go accent, 1px divider bottom border, wraps on narrow.
- **List row** — no card per row. `padding: var(--row-pad) var(--space-2)`,
  `border-bottom: 1px solid color-mix(text 8%)`, hover `text 4%`. `--row-pad` is `10.2px`
  comfortable / `7px` compact.

---

## Screens

### 1. Overview (`/`) — the home screen
**Purpose:** answer "what do I need to do, and what needs labeling", not "how am I doing financially".

**Layout**, top to bottom, max-width 1180px:
1. **Header** — kicker with the full date ("Wednesday, September 9"), h1 greeting
   ("Morning, Jacob"), then a 15px 60%-ink line that summarizes the day dynamically:
   `"{n} things to do, {m} purchases to label."` → `"{n} things to do, nothing to label."` →
   `"Nothing pending. Enjoy it."`
2. **Two-column grid** — `repeat(auto-fit, minmax(300px, 1fr))`, gap `space-6`, `align-items: start`.
   - **Today** (card): h4 + "{n} left" at 45% ink. Rows are buttons: a 17px circle (1.5px border at
     35% ink; when done, filled accent), the task at 15px, an optional 11px due hint at 40% ink on
     the right. Done tasks go 40% ink + line-through. Row hover: `text 5%`, radius `soft × 0.6`.
     Footer: an input ("Add something") + primary "Add"; Enter also submits.
   - **Sort these** (accent-bordered card): h4 + accent tag "{n} to label". Each item is a
     `text 4%` block, radius `soft × 0.7`, padding `space-3`: merchant 15px, "date · account"
     11px 45%, amount 16px tabular right-aligned; below, two guessed-category secondary buttons
     (13px) plus a "More…" ghost button. Tapping a guess clears the item.
     Empty state: centered, 22px Condensed "All sorted" + 13px 50% line.
3. **This month** (full-width card) — h4, a 14px 60% summary line
   ("$2,847 spent · $2,352 still yours"), a right-aligned "All transactions" link, then a wrapping
   row of category bars: label + tabular amount, and a 6px pill track (`text 8%`) with an accent
   fill. Minimum column width 130px.

### 2. Transactions (`/transactions`)
**Purpose:** clear the unlabeled queue first, then browse everything.

1. **Header** — h1 "Transactions", accent tag "{n} to label", primary "Sync now" pushed right.
2. **Filter row** — search input (flex, min 180px), category select (min 150px), segmented control
   All / Pending / Uncategorized.
3. **"Needs a category" section** — an accent-bordered card at the very top of the list, before
   anything else. h4 "Needs a category", accent tag, and a right-aligned 12px 45% hint
   ("Pick one and it drops into the list below"). Each row: merchant + "date · account", amount,
   and a **select** defaulting to "Choose a category…" with the user's categories. Choosing one
   removes the row from this section and inserts it into the list below with that category.
   Hide the whole section when the queue is empty.
4. **"Everything else"** — 11px uppercase 45% eyebrow, then transaction rows: merchant (with a
   trailing 11px "(pending)" when pending), "date · account" beneath, a neutral tag for the
   category, and the amount right-aligned in a 92px min-width tabular column. Whole row is a button
   → transaction detail.

### 3. Transaction detail
Back link ("← Transactions", 12px uppercase). Kicker with the full date, h1 merchant, then the
amount at 52px in Condensed. A spec-sheet card of label/value rows (label 11px uppercase 50% ink at
130px min-width; value right-aligned 14px): Account, Status, Plaid category, Raw description,
Transaction ID. Below the card, a "Your category" field: select + primary "Save" + secondary
"Cancel". Max-width 640px.

### 4. Categories
h1 + primary "New category" right-aligned. Grid `repeat(auto-fit, minmax(220px, 1fr))`, gap
`space-4`. Each card: a 9px square swatch + name (17px Condensed), the month's total at 24px
Condensed tabular, "{n} transactions this month" at 11px 50%, then two ghost buttons
(Rename / Recolor). Swatches come from the accent + neutral ramps only.

### 5. Connect a bank (empty state)
Centered card, max-width 460px, padding `space-8 space-6`, text-centered. Inside: a 96px dashed-
border plate with a 45° repeating-stripe fill and an 11px monospace label ("no accounts linked"),
h3 "Connect a bank", a 14px 65% paragraph, and a full-width primary "Connect with Plaid".

### 6. Login / Signup
Two equal columns (`repeat(auto-fit, minmax(280px, 1fr))`), min-height 520px, no nav bar.
- **Left**: an accent-900 (`#1d2d3d`) field — the one place a solid color block is allowed.
  Brand "JHUB" top, a 34px Condensed line at max 15ch ("Every transaction, sorted the day it
  lands."), a 13px 65% subline, and a 10px monospace version stamp at the bottom.
- **Right**: a segmented Log in / Sign up control, h3 that switches
  ("Welcome back" / "Create your account"), Email + Password fields (+ Confirm on signup),
  a full-width primary, and a 12px 50% hint line. Max-width 400px.

### 7. Settings
Max-width 640px, three cards stacked at `space-6`:
- **Account** — email + secondary "Sign out".
- **Notifications** — h4, a 13px 65% explanation, and a secondary toggle button whose label states
  the current state ("Notifications on — turn off" / "Turn on notifications").
- **Linked banks** — one row per account ("Bank — Account ·· mask", "synced 3m ago" at 11px 45%,
  a ghost "Disconnect"), then a secondary "Connect a bank".

---

## Interactions & behavior

- **Navigation** — one top nav: Overview, Transactions, Categories, Settings, with the signed-in
  email at 12px 45% on the right. The detail screen keeps Transactions marked `aria-current`.
- **Sorting a transaction** — picking a category (from the overview guesses or the transactions
  dropdown) is optimistic: the row leaves the queue immediately and the counters update everywhere
  the queue count appears (overview tag, dayline, transactions header). Persist via the existing
  category-update route; roll back and surface an inline message on failure.
- **Category guesses** — the two buttons on each overview queue item should come from Plaid's
  `plaidCategory` mapped to the user's own categories, plus their most-used category as the second
  option. Never more than two guesses; everything else lives behind "More…".
- **To-dos** — no table exists for these yet. They need one (`todos`: id, user_id, text, due_date,
  done, created_at) following the repo's Drizzle conventions and the `user_id` multi-tenancy rule.
  Toggling is optimistic; adding clears the input and appends at the end of the list.
- **Sync** — "Sync now" shows a pending label on the button itself; no spinner overlay.
- **Empty states** are written, not blank: every list has one (see the sort queue and
  connect-a-bank screens).
- **Money format** — `−$1,850.00` / `+$2,600.00`, always two decimals, thousands separators,
  tabular. Remember the repo's Plaid convention (positive amount = money *out*): flip the sign at
  the display layer, never in the database.

## Responsive behavior

Both phone and desktop are first-class. There are **no breakpoint-specific layouts** — every grid
is `repeat(auto-fit, minmax(<min>, 1fr))` and every row is `flex-wrap: wrap`, so the same markup
collapses from two columns to one without media queries. Content caps at 1180px.
Keep tap targets ≥44px on touch: the to-do rows and transaction rows already exceed it with
`--row-pad`.

## State

| State | Where | Notes |
| --- | --- | --- |
| `screen` | routing | Real routes, not local state: `/`, `/transactions`, `/transactions/[id]`, `/categories`, `/settings`, `/login`, `/signup` |
| unsorted queue | server | `transactions` where `category_id is null`, newest first |
| category assignment | optimistic client → server action | |
| todos | server + optimistic client | new table |
| push subscription | existing `push_subscriptions` | drives the Settings toggle label |
| auth mode | client | login/signup segmented control |

## Assets

None. No images, no icon set is required by these screens. If icons are added later, use
**Lucide at stroke-width 1.5** — nothing heavier.

## Files in this bundle

| File | What it is |
| --- | --- |
| `README.md` | This spec |
| `design-system.md` | The short, binding rules to keep in the repo — copy into `docs/` and reference from `CLAUDE.md` |
| `globals.css` | Drop-in replacement for `src/app/globals.css` (Tailwind v4 `@theme` + tokens) |
| `components.md` | Tailwind class recipes for every component and screen block |
| `JHub UI.dc.html` | The interactive design prototype — open in a browser to click through all seven screens |
| `industry.css` | The prototype's stylesheet: the source of truth for exact component CSS |
