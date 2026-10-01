"use client";

// The iOS on/off switch: a pill-shaped track with a round white knob that
// slides right (and the track turns the tint color) when on. Goes in a
// ListRow's `accessory` slot:
//   <ListRow title="Notifications" accessory={<Switch checked={on} onChange={toggle} label="Notifications" />} />
// Grayed out when `disabled`. The moving parts use inline styles so they
// look the same on every browser version.
export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** What it switches, for screen readers (e.g. "Notifications"). */
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      // 51x31 like iOS, inside a taller invisible area so it's easy to tap.
      className="-my-1.5 flex shrink-0 items-center py-1.5 disabled:opacity-45"
    >
      <span
        aria-hidden
        style={{
          position: "relative",
          display: "block",
          width: 51,
          height: 31,
          borderRadius: 999,
          background: checked ? "var(--color-accent)" : "var(--color-switch-off)",
          transition: "background 200ms",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: 2,
            width: 27,
            height: 27,
            borderRadius: 999,
            background: "#ffffff",
            boxShadow: "0 3px 8px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(0, 0, 0, 0.16)",
            transform: `translateX(${checked ? 20 : 0}px)`,
            transition: "transform 200ms cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        />
      </span>
    </button>
  );
}
