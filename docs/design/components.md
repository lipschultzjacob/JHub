# Component recipes (Tailwind v4)

Assumes the tokens in `globals.css`. Where a value has no utility, an arbitrary value on the
token is used — `bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]` — rather than a new hex.
If a pattern repeats more than twice, extract it to a component in `src/components/`.

Shorthands used below:
- `INK-65` = `text-[color-mix(in_srgb,var(--color-text)_65%,transparent)]`
- `INK-45` = `text-[color-mix(in_srgb,var(--color-text)_45%,transparent)]`
- `FILL-4` = `bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]`
- `RULE`   = `border-b border-[color-mix(in_srgb,var(--color-text)_8%,transparent)]`

## Page shell

```tsx
<div className="min-h-screen bg-bg text-text font-body">
  <Nav />
  <main className="mx-auto max-w-[1180px] px-4 py-6 flex flex-col gap-6">{children}</main>
</div>
```

## Nav

```tsx
<nav className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-divider">
  <span className="font-heading text-[18px] tracking-[0.04em] mr-auto">JHUB</span>
  <Link href="/" className="text-sm hover:text-accent aria-[current=page]:text-accent">Overview</Link>
  {/* Transactions, Categories, Settings */}
  <span className="text-xs INK-45">{email}</span>
</nav>
```

## Card

```tsx
<section className="flex flex-col gap-2 p-4 rounded-soft border border-divider FILL-4">
  <h4>Today</h4>
  …
</section>
```

Attention variant (the sort queue): swap the border for
`border-[color-mix(in_srgb,var(--color-accent)_40%,transparent)]`.

## Buttons

```tsx
// primary
"inline-flex items-center justify-center gap-1.5 rounded-control px-3 py-2 font-heading text-sm
 bg-accent text-bg border border-accent transition-colors duration-150
 hover:bg-[var(--color-accent-300)] hover:border-[var(--color-accent-300)]
 active:bg-[var(--color-accent-500)] disabled:opacity-45"

// secondary
"… bg-transparent text-text border border-divider
 hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)]
 active:bg-[color-mix(in_srgb,var(--color-text)_14%,transparent)]"

// ghost
"… bg-transparent text-accent border border-transparent px-1
 hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
```

## Input / select

```tsx
"w-full min-h-9 px-2.5 py-1.5 text-sm rounded-control text-text caret-[var(--color-accent)]
 bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)] border border-divider
 transition-colors duration-150
 placeholder:text-[color-mix(in_srgb,var(--color-text)_40%,transparent)]
 hover:border-[color-mix(in_srgb,var(--color-text)_45%,transparent)]
 focus-visible:border-accent focus-visible:outline-offset-0"
```

Field label: `className="block text-xs mb-[5px] INK-65"`.

## Segmented control

A `div` with `inline-flex overflow-hidden rounded-control border border-divider`; each option is a
`label` wrapping a visually-hidden radio:
`"inline-flex items-center gap-1.5 px-3 py-[7px] text-[13px] cursor-pointer
 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-divider
 has-[:checked]:bg-accent has-[:checked]:text-bg
 not-has-[:checked]:hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)]"`

## Tag

```tsx
// accent
"inline-flex items-center rounded-full px-[11px] py-[3px] text-[11px]
 bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)] text-[var(--color-accent-300)]"
// neutral
"… bg-[color-mix(in_srgb,var(--color-text)_10%,transparent)] text-[var(--color-neutral-300)]"
```

## Transaction row

```tsx
<button className="w-full text-left flex flex-wrap items-center gap-y-2 gap-x-4
                   px-2 py-[var(--row-pad)] RULE
                   hover:bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]">
  <div className="min-w-[160px] flex-1">
    <div className="text-[15px]">{merchant} {pending && <span className="text-[11px] INK-45">(pending)</span>}</div>
    <div className="text-[11px] INK-45">{date} · {account}</div>
  </div>
  <Tag variant="neutral">{category}</Tag>
  <span className="text-[15px] min-w-[92px] text-right tabular-nums">{amount}</span>
</button>
```

Money color: outflow `text-[color-mix(in_srgb,var(--color-text)_88%,transparent)]`,
inflow `text-accent`.

## To-do row

```tsx
<button className="flex items-start gap-3 px-1 py-2 rounded-[7px] text-left
                   hover:bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)]">
  <span className={`w-[17px] h-[17px] shrink-0 mt-[3px] rounded-full border-[1.5px]
    ${done ? "border-accent bg-accent" : "border-[color-mix(in_srgb,var(--color-text)_35%,transparent)]"}`} />
  <span className={`flex-1 text-[15px] ${done ? "line-through text-[color-mix(in_srgb,var(--color-text)_40%,transparent)]" : ""}`}>{text}</span>
  <span className="text-[11px] mt-1 text-[color-mix(in_srgb,var(--color-text)_40%,transparent)]">{when}</span>
</button>
```

## Sort-queue item

```tsx
<div className="flex flex-col gap-2 p-3 rounded-[8px] FILL-4">
  <div className="flex items-baseline gap-3">
    <div className="min-w-0 flex-1">
      <div className="text-[15px]">{merchant}</div>
      <div className="text-[11px] INK-45">{date} · {account}</div>
    </div>
    <span className="text-base tabular-nums">{amount}</span>
  </div>
  <div className="flex flex-wrap gap-2">
    {guesses.map(g => <button key={g} className="btn-secondary text-[13px] px-3 py-1">{g}</button>)}
    <button className="btn-ghost text-[13px]">More…</button>
  </div>
</div>
```

## Progress bar

Track: `h-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-text)_8%,transparent)]`;
fill: `h-full rounded-full bg-accent` with an inline `width` percentage.

## Grids

```tsx
// two-up panels that collapse on phone, no breakpoints
<div className="grid gap-6 items-start [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
// category cards
<div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
```

## Fonts (src/app/layout.tsx)

```ts
import { Barlow, Barlow_Condensed } from "next/font/google";
const barlow = Barlow({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-barlow" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["500","600","700"], variable: "--font-barlow-condensed" });
```

Apply both variables on `<html>`, and set `viewport.themeColor` to `#16171a`.
