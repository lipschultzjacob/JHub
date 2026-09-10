// Shared Tailwind class recipes, copied from docs/design/components.md. Kept
// in one place so every button/input/card across the app reads from the
// same design-system tokens (docs/design-system.md) instead of each one
// repeating -- or slowly drifting out of sync with -- the same long class
// string. Not a component itself, just exported strings, so both Server and
// Client Components can import it.

export const buttonPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-control px-3 py-2 font-heading font-semibold text-sm " +
  "bg-accent text-bg border border-accent transition-colors duration-150 " +
  "hover:bg-[var(--color-accent-300)] hover:border-[var(--color-accent-300)] " +
  "active:bg-[var(--color-accent-500)] disabled:opacity-45";

export const buttonSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-control px-3 py-2 font-heading font-semibold text-sm " +
  "bg-transparent text-text border border-divider transition-colors duration-150 " +
  "hover:bg-[color-mix(in_srgb,var(--color-text)_7%,transparent)] " +
  "active:bg-[color-mix(in_srgb,var(--color-text)_14%,transparent)] disabled:opacity-45";

export const buttonGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-control px-1 py-2 font-heading font-semibold text-sm " +
  "bg-transparent text-accent border border-transparent transition-colors duration-150 " +
  "hover:bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] disabled:opacity-45";

// No width utility baked in -- most inputs want `w-full`, but the inline
// per-row category select doesn't, so callers add it themselves.
export const inputBase =
  "min-h-9 px-2.5 py-1.5 text-sm rounded-control text-text caret-[var(--color-accent)] " +
  "bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)] border border-divider " +
  "transition-colors duration-150 " +
  "placeholder:text-[color-mix(in_srgb,var(--color-text)_40%,transparent)] " +
  "hover:border-[color-mix(in_srgb,var(--color-text)_45%,transparent)] " +
  "focus-visible:border-accent focus-visible:outline-offset-0";

export const fieldLabel =
  "block text-xs mb-[5px] text-[color-mix(in_srgb,var(--color-text)_65%,transparent)]";

// The design system's standard ink-opacity steps for secondary/meta text
// (docs/design/README.md's "Text opacities are the workhorse" rule).
export const bodyText65 = "text-[color-mix(in_srgb,var(--color-text)_65%,transparent)]";
export const metaText45 = "text-[color-mix(in_srgb,var(--color-text)_45%,transparent)]";

export const card =
  "flex flex-col gap-2 rounded-soft border border-divider p-4 " +
  "bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]";
