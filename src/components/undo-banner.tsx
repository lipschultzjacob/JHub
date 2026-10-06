"use client";

// The "Cleared · Undo"-style banner that floats just above the tab bar for a
// few seconds after an action that removes something from a list (swiping a
// card on Overview, checking an item off on To Do). It only draws the
// banner; the screen using it decides when to show and hide it.
export function UndoBanner({ message, onUndo }: { message: React.ReactNode; onUndo: () => void }) {
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(var(--tab-bar-height) + env(safe-area-inset-bottom) + 12px)",
        zIndex: 40,
        display: "flex",
        justifyContent: "center",
        padding: "0 16px",
        pointerEvents: "none",
      }}
    >
      <div
        className="flex w-full max-w-app items-center gap-2.5 pl-5"
        style={{
          pointerEvents: "auto",
          borderRadius: 20,
          background: "var(--color-surface-elevated)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <span className="flex-1 truncate text-subheadline">{message}</span>
        <button type="button" onClick={onUndo} className="min-h-12 px-5 text-body font-semibold text-accent active:opacity-60">
          Undo
        </button>
      </div>
    </div>
  );
}
