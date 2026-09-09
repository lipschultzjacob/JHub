# JHub design system

The binding visual rules for this app. Read before adding or changing any UI.
Full spec with per-screen detail: `design_handoff_jhub_ui/README.md`.

## The idea

JHub is a **casual budgeter and personal hub**, not a finance dashboard. The home screen leads with
what the user has to *do* — tasks, and purchases waiting to be labeled. Money is present but quiet:
one summary strip, no wall of KPI tiles. Copy is plain and human ("Morning, Jacob",
"$2,847 spent · $2,352 still yours"), never corporate.

Derived from the Industry design system (steel accent, Barlow Condensed over Barlow, modular grid),
adapted to a **dark ground** and **rounded** geometry.

## Non-negotiables

1. **One accent.** `#94bce3` steel blue, and nothing else. No green/red for money, no status
   colors, no gradients. Money out is plain ink; money in is the accent.
2. **Dark ground only.** `#16171a` page, `#e6e6ea` ink. No light mode, no `prefers-color-scheme`
   branch.
3. **Depth comes from opacity, not fills.** Cards are a 1px 12%-ink border over a 4%-ink wash.
   Avoid shadows.
4. **Rounded: 12px cards, 9px controls, pill tags.** No square corners, and no registration corner
   marks (the parent system has them; this app dropped them).
5. **Barlow Condensed 600 for headings, Barlow for body.** Numbers are always tabular; large
   amounts use the heading font.
6. **Every interactive element gets a themed hover, an active state, and the accent
   `:focus-visible` ring.** On this dark ground, states step *lighter* along the ramp.
7. **No media-query layouts.** `auto-fit`/`minmax` grids and `flex-wrap` rows only, so phone and
   desktop share one markup path.
8. **No icons unless necessary**; if used, Lucide at stroke-width 1.5.
9. **Every list has a written empty state.** No blank panels.
10. **Never hard-code a hex, font name, or spacing px** that a token in `globals.css` already
    carries.

## Adding a new screen

Compose from what exists — top nav, card, list row, tag, button, input, segmented control — before
inventing anything. A new screen should be: h1 title row (with its one primary action pushed right),
then cards in an `auto-fit` grid, then lists inside them. If something genuinely new is needed, add
it to `components.md` in the same commit and keep it on the tokens.

## Anti-patterns

- KPI tile grids across the top of a screen — the product deliberately moved away from them.
- A second accent, or semantic red/green.
- A card per list row (rows are separated by an 8%-ink rule, not by boxes).
- Dense finance-app tables on phone widths.
- Spinner overlays; put pending state on the control that was pressed.
