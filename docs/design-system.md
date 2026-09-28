# JHub design system

The binding visual rules for this app. Read before adding or changing any UI. This file is the
whole spec. When building or reworking a screen, follow the rules below and use judgment for
layout. Don't treat any one screen's past implementation as a template to copy literally.

> **Transition in progress (from 2026-09-28).** This file describes the *new* iOS-native direction.
> The app, `docs/design/components.md`, and `src/components/recipes.ts` still reflect the old look
> (dark-only, Barlow fonts, bordered cards) until each screen's overhaul issue lands. When you touch a
> screen, build it to this file, not to the old recipes. Replace the old recipes as you go.

## Platform: an iPhone app

**Design JHub as if it were an iPhone app.** The real product is the app installed on an iPhone
(added to the Home Screen, opened full-screen with no browser bar). The desktop/web-browser version
exists only as a development convenience. Judge every screen on an iPhone, not on a desktop browser,
and don't spend design effort on desktop-specific layouts.

On a desktop browser the app renders as a single phone-width column (max ~430px, the widest
iPhone) centered on the page. It's there for development only; no desktop-specific layouts.

## The idea

JHub is a **casual budgeter and personal hub**, not a finance dashboard. The home screen leads with
what the user has to *do*, like purchases waiting to be labeled. Money is present but quiet: no wall
of KPI tiles. Copy is plain and human ("$2,847 spent · $2,352 still yours"), never corporate.

It should look and behave like **a built-in Apple app**: the same structure, controls and
typography as Apple's Settings, Mail or Wallet, following Apple's Human Interface Guidelines (HIG).
The only piece of JHub's own identity is its tint color, a steel blue.

## Non-negotiables

1. **iOS-native look.** Grouped inset lists, large titles, a bottom tab bar, sheets, swipe actions.
   When unsure how something should look or behave, do what a built-in iPhone app does.
2. **Follows the phone's Light/Dark setting.** Every color is a token in `globals.css` with a
   light and a dark value, switched by `prefers-color-scheme`. Never a color that only works in one
   mode.
3. **One tint: steel blue.** Buttons, links, the selected tab and switches use the tint. Other color
   is limited to Apple's system meanings: **green** for money coming in, **red** for destructive
   actions (Delete). Money going out is plain text. No gradients or decorative color.
4. **Apple's system font.** `-apple-system, BlinkMacSystemFont, system-ui, sans-serif`, which is SF Pro
   on an iPhone. No custom or downloaded fonts. (SF Pro's license doesn't allow shipping it as a
   web font; the system stack gets it for free on Apple devices.) Numbers are always tabular
   (`tabular-nums`), so digits line up in columns.
5. **Built for touch.** Every tappable thing is at least **44×44px**. Nothing depends on hover
   (there is no hover on a phone). Everything gives visible *pressed* feedback. Text inputs use at
   least **16px** text; anything smaller makes iPhone Safari zoom the page when you tap into it.
6. **Respect the notch and home bar.** The app draws edge to edge (`viewport-fit=cover`) and pads
   content by the safe-area insets (`env(safe-area-inset-*)`), so nothing hides under the status
   bar, the Dynamic Island, or the home indicator.
7. **Every list has a written empty state.** No blank screens.
8. **Pending state lives on the control that was pressed.** No full-screen spinners.
9. **Never hard-code** a color, font or spacing value that a token in `globals.css` already carries.
10. **Hand-built with Tailwind.** No UI component library. The iOS pieces below are our own small
    components, kept in `src/components/` with their recipes in `docs/design/components.md`.

## Color tokens

Values follow Apple's system colors. The tint's light-mode value is darker so it stays readable on
white. All of these are starting values, to confirm on a real iPhone when the app-shell issue lands.

| Token | Light | Dark | Used for |
|---|---|---|---|
| background (grouped) | `#F2F2F7` | `#000000` | the screen behind grouped lists |
| surface (grouped cell) | `#FFFFFF` | `#1C1C1E` | list sections, sheets |
| label | `#000000` | `#FFFFFF` | primary text |
| secondary label | `rgba(60,60,67,0.6)` | `rgba(235,235,245,0.6)` | subtitles, section headers/footers |
| separator | `rgba(60,60,67,0.29)` | `rgba(84,84,88,0.65)` | hairlines between rows |
| fill (pressed row) | `#D1D1D6` | `#2C2C2E` | a row's pressed-down highlight |
| tint | `#416180` | `#94BCE3` | buttons, links, selected tab, switches |
| green (money in) | `#248A3D` | `#30D158` | incoming amounts |
| red (destructive) | `#FF3B30` | `#FF453A` | Delete actions |

## Type scale (Apple's text styles)

| Style | Size / line height | Weight | Used for |
|---|---|---|---|
| Large Title | 34 / 41 | bold | a tab's screen title |
| Title 3 | 20 / 25 | semibold | big amounts |
| Headline | 17 / 22 | semibold | sheet titles, emphasized row text |
| Body | 17 / 22 | regular | row text, inputs, buttons |
| Subheadline | 15 / 20 | regular | secondary row text |
| Footnote | 13 / 18 | regular | section headers (uppercase) and footers |
| Caption | 12 / 16 | regular | tab labels, fine print |

## Structure and components

- **Tab bar** (bottom, always visible on top-level screens): Overview, Categories, Settings. Each
  tab is an icon over an 10–11px label. The selected tab is tinted; the others are secondary label
  color. The bar has a translucent blurred background, a top hairline, and bottom safe-area
  padding. Icons are [Lucide](https://lucide.dev) at stroke-width 1.5–2. Apple's own SF Symbols
  can't be used on the web, and Lucide is the closest match. Icons appear only where iOS would use
  them (tabs, row accessories, empty states).
- **Large title**: each tab's screen opens with its name as a Large Title at the top of the
  scrolling content. Collapsing it into a small centered title while scrolling is optional polish.
- **Pushed screens** (e.g. one category's transactions): a top navigation bar with a tinted
  "‹ Categories" back button and a centered Headline title.
- **Grouped inset list**: the main container, replacing the old bordered cards. Rounded (10px)
  sections on the grouped background, inset from the screen edges. Rows are at least 44px tall,
  separated by hairlines that start at the text's left edge. Optional section header above
  (Footnote, uppercase, secondary) and footer below (Footnote, secondary). A row that opens
  another screen ends in a gray chevron (›).
- **Row pressed state**: tapping a row briefly fills it with the pressed-row color. The browser's
  default gray tap flash is turned off (`-webkit-tap-highlight-color: transparent`).
- **Buttons**: mostly plain tinted text, like "Edit" or "+" in a nav bar, or a tinted row such as
  "Connect a Bank". A filled tint button (full width, 50px tall, 12px corners) is only for the one
  main action of a screen or sheet. Destructive buttons use red text.
- **Sheets**: creating and editing (New Category, Rename, ...) happen in a sheet that slides up from
  the bottom. It has rounded top corners, a grabber, and dims the screen behind it. Its top bar
  holds Cancel (left), a Headline title (center), and Save/Done (right, semibold, disabled until
  the input is valid).
- **Swipe actions**: swiping a list row left reveals a red **Delete** button. Deleting anything
  whose effects aren't obvious asks first, with an iOS action sheet: a panel from the bottom with
  a red "Delete Category" button and Cancel.
- **Switch**: on/off settings (e.g. Notifications) use an iOS-style toggle switch in the row, tinted
  when on.
- **Empty state**: centered in the available space, with a large secondary-color icon, a Headline
  title, and one Subheadline sentence (plus a tinted button if there's an obvious next step).

## Motion

Sheets and pushed screens move the way iOS does: a quick ease-out, about 300ms. Pressed states are
instant. Honor `prefers-reduced-motion` (cross-fade instead of sliding).

## Anti-patterns

- Desktop layouts: multi-column grids, wide tables, hover menus, top navigation bars with links.
- Anything that only works with hover, or tap targets under 44px.
- Text inputs under 16px (causes the iPhone zoom-on-focus jump).
- A color that only works in dark mode or only in light mode.
- Custom fonts, or a second decorative color beyond the tint and the system green/red meanings.
- KPI tile grids across the top of a screen.
- Full-screen spinner overlays.
