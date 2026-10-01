# Component recipes (Tailwind v4)

Assumes the tokens in `globals.css`. Where a value has no utility, an arbitrary value on the
token is used — `bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]` — rather than a new hex.
If a pattern repeats more than twice, extract it to a component in `src/components/`.

Shorthands used below:
- `INK-65` = `text-[color-mix(in_srgb,var(--color-text)_65%,transparent)]`
- `INK-45` = `text-[color-mix(in_srgb,var(--color-text)_45%,transparent)]`
- `FILL-4` = `bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]`
- `RULE`   = `border-b border-[color-mix(in_srgb,var(--color-text)_8%,transparent)]`

## Tokens and iPhone basics (src/app/globals.css)

Colors (each switches between Light and Dark on its own; see docs/design-system.md):
`bg-bg`, `bg-surface`, `text-text`, `text-text-secondary`, `border-separator`, `bg-fill-pressed`,
`text-accent` / `bg-accent` (the tint), `text-on-accent` (text on a filled tint button),
`text-green` (money in), `text-red` (destructive, errors).

Type (Apple's text styles, size + line height + weight in one class): `text-large-title`,
`text-title3`, `text-headline`, `text-body`, `text-subheadline`, `text-footnote`, `text-caption`.

Safe areas: `pt-safe`, `pb-safe`, `px-safe` (padding that clears the notch / status bar / home
indicator, never less than the normal margin). `max-w-app` = the 430px phone column.

Spacing: new iOS-style code uses whole-pixel values — `gutter` (16px, e.g. `px-gutter`),
`--edge` (20px), `--section-gap` (32px, `gap-(--section-gap)`). Avoid the old `1/2/3/4/6/8` steps
in new code: they're a 0.85× scale (`p-4` is 13.6px) whose fractional positions can make
hairlines vanish. Positioning classes don't accept custom spacing names (`left-gutter` does
nothing), so use the variable form: `left-(--gutter)`.

**Hairlines** (thin iOS separators): draw them as a **0.5px border**, never a 0.5px-tall box.
Browsers draw a nonzero border at least one device pixel wide, but snap a 0.5px *box* to zero, so
it silently disappears.

**Pressed states** (`active:`) work on iPhone because `TouchActiveStates` (root layout) adds the
touch listener Safari needs before it applies `:active`.

## Page shell — `src/app/(app)/layout.tsx`

```tsx
<main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-(--section-gap) px-safe pt-safe pb-tabbar">
  {children}
</main>
<TabBar />
```

`pb-tabbar` leaves room for the tab bar + home indicator so the last row can scroll above the bar.

## Tab bar — `src/components/tab-bar.tsx`

Fixed to the bottom, full width, with a blurred see-through background:
`fixed inset-x-0 bottom-0 z-10 border-t-[0.5px] border-separator bg-bar pb-home-indicator backdrop-blur-xl`.
Inside, a `max-w-app` row of 49px (`h-(--tab-bar-height)`). Each tab is a Link:
`flex flex-1 flex-col items-center gap-0.5 pt-1.5 no-underline active:opacity-60`, `text-accent`
when selected (`aria-current="page"`), otherwise `text-text-secondary`. It holds a Lucide icon
(24px, stroke 1.75) over a `text-[10px] leading-3 font-medium` label. The icons are Inbox
(Overview), Tags (Categories), and Settings.

## Large title — `src/components/large-title.tsx`

`<LargeTitle>Settings</LargeTitle>` is an `<h1 className="m-0 text-large-title">` (34/41 bold) at
the top of each tab's content. Pushed screens use the nav bar below instead.

`action` puts a button at the far right, level with the title. For example, the Categories "+":
a 44px tinted Lucide Plus (28px), `-mr-2.5` so the icon lines up with the screen edge.

## Nav bar (pushed screens) — `src/components/nav-bar.tsx`

`<NavBar title="Chase" backHref="/settings" backLabel="Settings" />` goes at the top of a screen
you go *into* from a list (e.g. a bank's screen inside Settings). It's a `grid
grid-cols-[1fr_auto_1fr]` row, `min-h-11`. On the left is a tinted Link (Lucide ChevronLeft, 28px,
+ the label, `active:opacity-60`), and in the middle a truncated `text-headline` `<h1>`. The tab bar
stays visible on pushed screens, and the parent tab stays selected.

`action` fills the right column with a button. For example, a category's "Rename" is plain tinted
`text-body` text (`min-h-11`, `active:opacity-60`).

## Empty state — `src/components/empty-state.tsx`

`<EmptyState icon={Tags} title="No Categories" message="Create one to start sorting your
transactions." action={<button className="min-h-11 text-body text-accent">New Category</button>} />`

It's centered in the free space (`flex-1`, `py-16`), with a 48px Lucide icon in
`text-text-secondary` (stroke 1.5), a `text-headline` title, a `text-subheadline` secondary
sentence, and an optional tinted button. Every list uses one of these when it's empty.

## Sort deck (Overview) — `src/components/sort-deck.tsx`

`<SortDeck transactions={...} categories={rankedMostUsedFirst} assign={save} emptyState={...} />`
(wired up by `overview-deck.tsx`). This is a custom interaction, tuned on the iPhone:

- **Deck:** the top card, with up to 3 more behind it. Each step back is 5% smaller and 14px lower
  so the edges show, and is shaded darker by `--deck-shade` (barely in Light, clearly in Dark,
  where shadows can't show depth). Cards are `--color-surface-elevated`, 28px corners, with the
  `--card-shadow` token (a soft shadow in Light; a faint light edge plus top highlight in Dark).
  The content is date · account (top), the amount (46px semibold, money in green "+"), the
  merchant (Title 3), and a soft "Pending" pill.
- **Swipe:** left flies the top card off (tilting) to show the next; right brings the previous card
  back on top. It commits past 25% of the width or on a fast flick, otherwise springs back. The
  first/last card resists.
- **Hold (400ms, finger still):** a full-screen dimmed overlay with a **3×2 grid of equal cells**
  (26px corners, 82% elevated surface, blurred) holding the 5 most-used categories plus
  "More…", or all 6 if there are six or fewer. A round **✕** (60px) sits dead center to cancel.
  The hovered cell turns solid tint with `text-on-accent` and grows 3%. A small tilted copy of the
  card follows the finger; over the ✕ it shrinks away so only the darkened ✕ shows. The deck
  behind fades to 8%.
- **Drop:** a category sorts it (the card hides instantly, and the save runs in the background; on
  failure it comes back with an error). "More…" opens a "Sort Into" sheet listing the rest. The
  ✕ or a gap cancels. After each sort, a "Sorted into X · Undo" banner shows above the tab bar
  for 5s.
- `touch-action: none`, no text selection, and no long-press callout on the deck and grid, so the
  browser never scrolls or selects mid-gesture. Hit-testing uses `document.elementFromPoint` on
  `[data-drop]` targets.
- Shapes, shadows and motion are **inline styles**, which render the same on every iPhone (see
  docs/DECISIONS.md).

## Transaction row (list) — `src/components/transaction-list-row.tsx`

One transaction inside a `ListSection`. The left side is the merchant (`text-body`) over
"Sep 12 · Checking" (`text-subheadline text-text-secondary`, prefixed "Pending · " if pending). The
right side is the amount (`tabular-nums`; money in is `text-green` with a "+", via `formatMoney`)
over the category dropdown, restyled as tinted `text-body` text with no box. It stays 17px so
iPhone Safari doesn't zoom in when it's tapped, and tapping it opens Apple's picker wheel. The
row keeps the `transaction-<id>` anchor for notification links.

## Switch — `src/components/switch.tsx`

`<ListRow title="Notifications" accessory={<Switch label="Notifications" checked={on}
onChange={toggle} disabled={!usable} />} />`

It's the iOS on/off switch: a 51×31 pill track (`--color-accent` when on, `--color-switch-off`
when off) with a 27px white knob that slides 20px. The moving parts are inline styles. It's a
`role="switch"` button with `aria-checked`, and it's grayed out (`opacity-45`) when disabled, with
the reason in the section footer.

## Grouped inset list — `src/components/grouped-list.tsx`

```tsx
<ListSection header="Connected banks" footer="Last synced a minute ago.">
  <ListRow title="Chase" subtitle="Connected 2026-09-12" chevron href="/settings/banks/1" />
  <ListRow title="Groceries" value="12" chevron href="/categories/3" />
  <ListRow title="Connect a Bank" tone="tint" onClick={connect} />
</ListSection>
<ListSection>
  <ListRow title="Sign Out" tone="destructive" onClick={signOut} />
</ListSection>
```

- Section: `rounded-list bg-surface overflow-hidden`. The header is `text-footnote uppercase
  text-text-secondary px-gutter pb-1.5` and the footer is the same without uppercase, with `pt-1.5`.
- Row: `min-h-11` (44px), `px-gutter py-2.5`, `bg-surface`. `active:bg-fill-pressed` applies only
  when it's a link/button. The title is `text-body`, the subtitle `text-subheadline
  text-text-secondary`, the value `text-body text-text-secondary tabular-nums`, and the chevron is a
  Lucide ChevronRight at 18px.
- Separator: an `::after` on every row but the last, inset to the text's left edge:
  `not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0
  not-last:after:left-(--gutter) not-last:after:h-0 not-last:after:border-b-[0.5px]
  not-last:after:border-separator`.
- Tones: `default` (`text-text`), `tint` (`text-accent`, action rows), `destructive` (`text-red`).
- `accessory` holds anything else on the right: a switch, a dropdown.
- The pressed color is `active:bg-(--row-pressed)`. It's a variable (normally the fill-pressed
  color) so a swipeable row can switch it off mid-swipe.

## Swipe to delete — `src/components/swipe-row.tsx`

```tsx
<ListSection>
  {categories.map((c) => (
    <SwipeToDelete key={c.id} onDelete={() => setConfirming(c)} held={confirming?.id === c.id}>
      <ListRow title={c.name} value={c.count} chevron href={`/categories/${c.id}`} />
    </SwipeToDelete>
  ))}
</ListSection>
<ConfirmAlert open={confirming !== null} title={`Delete ${confirming?.name}?`}
  message="Are you sure? Its 12 transactions will go back to unsorted."
  confirmLabel="Delete" onConfirm={reallyDelete} onCancel={() => setConfirming(null)} />
```

- Swiping left grows a **red panel with a white trash can** (Lucide Trash2) in from the right. The
  icon grows as you pull, and turns fully solid once letting go would delete.
- The **threshold** is 30% of the row's width, clamped to 80–140px. Letting go past it calls
  `onDelete` (normally opening the ConfirmAlert). Letting go before it springs the row back.
- While `held` is true (the alert is up), the row stays pulled open with the red showing. When
  `held` turns false (Cancel), it springs back.
- **Layout is deliberately plain:** the row and the red panel sit side by side in one flex strip
  that slides with `transform`. The panel's width equals how far the row has moved. There's no
  absolutely-positioned hidden layer, and the moving parts use inline styles, not utility
  classes. (The first version used a hidden absolute layer, and on a real iPhone it showed up as
  blank space above each row.)
- `touch-action: pan-y` keeps up/down movement a normal page scroll. A drag only counts as a
  swipe once it's clearly sideways and leftward. The long-press link preview is off, and a click
  the browser sends at the end of a swipe is swallowed (the flag resets on every new touch, since
  phones usually don't send that click at all).
- The wrapper carries the row separator (`rowSeparatorClass`). There's deliberately no non-swipe
  way to delete (decided on #23).

## "Are you sure?" alert — `src/components/confirm-alert.tsx`

This is a centered iOS alert: a 270px box, `rounded-[14px] bg-surface-elevated`, over `bg-dim`.
It has a Headline title, a Footnote message, then Cancel (semibold tint) and the red confirm
button side by side, separated by 0.5px borders. It pops in from 110% scale with a fade (inline
styles). Tapping the dimmed area does nothing (as in iOS); Escape cancels. It keeps showing its
last title/message while fading out, so clearing the caller's state doesn't blank it mid-fade.

## Sheet — `src/components/sheet.tsx`

```tsx
<ListRow title="New Category..." tone="tint"
  onClick={() => { primeKeyboard(); setAdding(true); }} />
<Sheet open={adding} title="New Category" saveLabel="Add" saveDisabled={name.trim() === ""}
  saving={isPending} onCancel={() => setAdding(false)} onSave={save}>
  <ListSection>…fields…</ListSection>
</Sheet>
```

- It slides up (`duration-300 ease-ios`) over `bg-dim`, with `rounded-t-[10px]`, a grabber, and a
  top bar of Cancel / Headline title / Save (semibold, disabled until valid). The sheet is a
  `<form>`, so Enter saves.
- It uses **elevated** colors (`bg-bg-elevated`, and it redefines `--color-surface` to the
  elevated surface for everything inside). In Light mode these match the normal colors; in Dark
  mode they're lighter grays, which keeps the sheet visible against a black screen.
- **Keyboard:** it rises above the iPhone keyboard (`useKeyboardInset`, via
  `window.visualViewport`). An iPhone only opens the keyboard when a text box is focused *during the
  tap*, so the tap that opens a sheet with a text box must call `primeKeyboard()` first. The sheet
  then moves focus to its first field.
- No drag-down-to-dismiss yet; Cancel, tapping the backdrop, or Escape close it.

Shared overlay plumbing lives in `src/components/overlay.tsx`: appear/disappear timing, scroll lock,
Escape, keyboard inset, `usePrefersReducedMotion` (the Sheet fades instead of sliding when Reduce
Motion is on), and a `Portal` that renders into `<body>` so a swiped row's transform can't drag an
overlay along.

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

## Fonts

Apple's system font via `font-sans` (the default on `body`); no font files are loaded.
`font-heading` / `font-body` are old names for the same font, kept until screens are rebuilt.
`viewport.themeColor` in `src/app/layout.tsx` lists one color per mode, matching `--color-bg`.
