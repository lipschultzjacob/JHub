"use client";

import { useEffect, useId, useRef } from "react";
import {
  Portal,
  usePresence,
  useScrollLock,
  useEscape,
  useKeyboardInset,
  usePrefersReducedMotion,
} from "@/components/overlay";

// A stand-in text box used by primeKeyboard below, and the element that had
// focus before it (to give focus back when the sheet closes).
let keyboardProxy: HTMLInputElement | null = null;
let focusBeforeSheet: HTMLElement | null = null;

// Call this at the start of the tap handler that opens a Sheet containing a
// text box: `onClick={() => { primeKeyboard(); setOpen(true); }}`.
//
// Why: an iPhone only opens its keyboard when a text box is focused *during*
// the tap itself. The Sheet's text box doesn't exist yet at that moment (it
// appears a moment later), so focusing it then would do nothing. This
// focuses an invisible stand-in text box right away, inside the tap, which
// opens the keyboard. The Sheet then moves focus to its real text box, and
// since focus goes straight from one text box to another, the keyboard
// stays open.
export function primeKeyboard() {
  focusBeforeSheet = document.activeElement as HTMLElement | null;
  keyboardProxy?.remove();
  const input = document.createElement("input");
  input.setAttribute("aria-hidden", "true");
  // 16px text so the iPhone doesn't zoom in on it; invisible and pinned to
  // the top so focusing it doesn't scroll the page anywhere.
  input.style.cssText = "position:fixed;top:0;left:0;opacity:0;height:0;font-size:16px;";
  document.body.appendChild(input);
  input.focus();
  keyboardProxy = input;
}

// The iOS sheet: a panel that slides up from the bottom over a dimmed
// screen, with a grabber, a top bar (Cancel on the left, a title, and Save on
// the right), and whatever form fields you put inside. Used for creating and
// editing things (New Category, Rename). Enter in a text box also saves.
// The panel rises above the on-screen keyboard so its text box stays
// visible. Leave out `onSave` for a sheet you just pick from (e.g. a list
// of choices): it then has no Save button.
//
// Usage:
//   <Sheet open={adding} title="New Category" onCancel={close} onSave={save}
//     saveDisabled={name.trim() === ""} saving={isPending}>
//     ...fields...
//   </Sheet>
export function Sheet({
  open,
  title,
  onCancel,
  onSave,
  saveLabel = "Save",
  saveDisabled = false,
  saving = false,
  children,
}: {
  open: boolean;
  title: string;
  onCancel: () => void;
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  saving?: boolean;
  children: React.ReactNode;
}) {
  const { mounted, visible } = usePresence(open);
  const keyboardInset = useKeyboardInset(open);
  const reducedMotion = usePrefersReducedMotion();
  const panelRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  useScrollLock(open);
  useEscape(open, onCancel);

  // Once the sheet is on the page: move focus to its first text box (or the
  // panel itself if it has none), and remove primeKeyboard's stand-in.
  useEffect(() => {
    if (!mounted || !open) return;
    const panel = panelRef.current;
    const field = panel?.querySelector<HTMLElement>("input, textarea, select");
    (field ?? panel)?.focus({ preventScroll: true });
    keyboardProxy?.remove();
    keyboardProxy = null;
  }, [mounted, open]);

  // After it closes, give focus back to whatever had it before (usually the
  // button that opened the sheet).
  useEffect(() => {
    if (open) return;
    focusBeforeSheet?.focus?.({ preventScroll: true });
    focusBeforeSheet = null;
  }, [open]);

  if (!mounted) return null;

  const barButton = "min-h-11 px-gutter text-body text-accent active:opacity-60 disabled:opacity-45";

  return (
    <Portal>
      <div className="fixed inset-0 z-50">
        {/* The dimmed screen behind the sheet; tapping it cancels. */}
        <div
          aria-hidden
          onClick={onCancel}
          className="absolute inset-0 bg-dim"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 300ms" }}
        />
        <form
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onSubmit={(e) => {
            e.preventDefault(); // Enter in a text box saves, like tapping Save
            if (onSave && !saveDisabled && !saving) onSave();
          }}
          // Sits above the keyboard, and slides up from below the screen
          // (or just fades, with Reduce Motion on). The animation uses plain
          // inline styles so it behaves the same on every iOS version. Also
          // swaps in the "elevated" colors (see globals.css) so list
          // sections inside use them too -- that's what keeps the sheet
          // visible against a black screen.
          style={{
            bottom: keyboardInset,
            transform: visible || reducedMotion ? "translateY(0)" : "translateY(100%)",
            opacity: visible || !reducedMotion ? 1 : 0,
            transition: "transform 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms",
            ["--color-surface" as string]: "var(--color-surface-elevated)",
          }}
          className="absolute inset-x-0 mx-auto flex max-h-[90dvh] w-full max-w-app flex-col rounded-t-[10px] bg-bg-elevated pb-safe outline-none"
        >
          {/* The grabber: the small pill at the top that marks this as a sheet. */}
          <div aria-hidden className="mx-auto mt-1.5 h-[5px] w-9 rounded-full bg-separator" />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <button type="button" onClick={onCancel} className={`${barButton} justify-self-start`}>
              Cancel
            </button>
            <h2 id={titleId} className="m-0 text-headline">
              {title}
            </h2>
            {onSave && (
              <button
                type="submit"
                disabled={saveDisabled || saving}
                className={`${barButton} justify-self-end font-semibold`}
              >
                {saving ? "Saving..." : saveLabel}
              </button>
            )}
          </div>
          <div className="overflow-y-auto overscroll-contain px-safe pt-2">{children}</div>
        </form>
      </div>
    </Portal>
  );
}
