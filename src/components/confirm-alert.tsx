"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Portal, usePresence, useScrollLock, useEscape } from "@/components/overlay";

// The iOS "are you sure?" alert: a small box in the middle of a dimmed
// screen with a bold title, a short message, and two buttons side by side
// -- Cancel and a red confirm button (e.g. "Delete"). Used before anything
// destructive. Like iOS alerts, tapping the dimmed area does nothing; you
// have to pick a button (Escape also cancels, for desktop testing).
//
// Usage:
//   <ConfirmAlert open={confirming !== null} title="Delete Groceries?"
//     message="Its 12 transactions will go back to unsorted."
//     confirmLabel="Delete" onConfirm={reallyDelete} onCancel={() => setConfirming(null)} />
// onConfirm should also close it (set `open` to false).
export function ConfirmAlert({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { mounted, visible } = usePresence(open);
  const boxRef = useRef<HTMLDivElement>(null);
  // The text last shown while open. Closing usually clears whatever the
  // title/message were built from (e.g. "which row" becomes null), so while
  // the alert fades out it keeps showing this instead of a blank "Delete ?".
  const [shown, setShown] = useState({ title, message });
  if (open && (shown.title !== title || shown.message !== message)) setShown({ title, message });
  const titleId = useId();
  const messageId = useId();
  useScrollLock(open);
  useEscape(open, onCancel);

  // Moves focus into the alert once it appears (so screen readers and the
  // keyboard land in it). Focuses the box itself, not a button, so no focus
  // ring gets drawn around Cancel on the phone.
  useEffect(() => {
    if (visible) boxRef.current?.focus({ preventScroll: true });
  }, [visible]);

  if (!mounted) return null;

  const button = "min-h-11 px-2 text-body active:bg-(--row-pressed)";

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          aria-hidden
          className="absolute inset-0 bg-dim"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms" }}
        />
        {/* Pops in slightly larger and settles to full size, like iOS. */}
        <div
          ref={boxRef}
          tabIndex={-1}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={shown.message ? messageId : undefined}
          className="relative w-[270px] overflow-hidden rounded-[14px] bg-surface-elevated text-center outline-none"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(1.1)",
            transition: "opacity 200ms, transform 200ms",
          }}
        >
          <div className="px-4 pt-5 pb-4">
            <h2 id={titleId} className="m-0 text-headline">
              {shown.title}
            </h2>
            {shown.message && (
              <p id={messageId} className="m-0 mt-1 text-footnote">
                {shown.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 border-t-[0.5px] border-separator">
            <button
              type="button"
              onClick={onCancel}
              className={`${button} border-r-[0.5px] border-separator font-semibold text-accent`}
            >
              Cancel
            </button>
            <button type="button" onClick={onConfirm} className={`${button} text-red`}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
