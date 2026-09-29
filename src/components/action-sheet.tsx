"use client";

import { useEffect, useRef } from "react";
import { Portal, usePresence, useScrollLock, useEscape } from "@/components/overlay";

// The iOS confirmation panel ("action sheet") that slides up from the
// bottom before something destructive happens: an optional gray message, a
// red button that does it (e.g. "Delete Category"), and a separate Cancel
// button underneath. Tapping the dimmed area behind it also cancels.
//
// Usage:
//   <ActionSheet open={confirming} message="..." confirmLabel="Delete Category"
//     onConfirm={reallyDelete} onCancel={() => setConfirming(false)} />
// onConfirm should also close it (set `open` to false).
export function ActionSheet({
  open,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message?: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { mounted, visible } = usePresence(open);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useScrollLock(open);
  useEscape(open, onCancel);

  // Starts keyboard focus on Cancel (the safe choice) once it slides in.
  useEffect(() => {
    if (visible) cancelRef.current?.focus({ preventScroll: true });
  }, [visible]);

  if (!mounted) return null;

  const button =
    "flex min-h-14 w-full items-center justify-center px-gutter text-[20px] leading-6 active:bg-(--row-pressed)";

  return (
    <Portal>
      <div className="fixed inset-0 z-50">
        {/* The dimmed screen behind the panel; tapping it cancels. */}
        <div
          aria-hidden
          onClick={onCancel}
          className={`absolute inset-0 bg-dim transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={confirmLabel}
          className={`absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-app flex-col gap-2 px-2 pb-[max(--spacing(2),env(safe-area-inset-bottom))] transition duration-300 ease-ios motion-reduce:translate-y-0 ${
            visible ? "translate-y-0 opacity-100" : "translate-y-full motion-reduce:opacity-0"
          }`}
        >
          <div className="overflow-hidden rounded-[14px] bg-surface">
            {message && (
              <p className="m-0 border-b-[0.5px] border-separator px-gutter py-3.5 text-center text-footnote text-text-secondary">
                {message}
              </p>
            )}
            <button type="button" onClick={onConfirm} className={`${button} text-red`}>
              {confirmLabel}
            </button>
          </div>
          <div className="overflow-hidden rounded-[14px] bg-surface">
            <button ref={cancelRef} type="button" onClick={onCancel} className={`${button} font-semibold text-accent`}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
