"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Shared plumbing for things that slide up over the whole screen: the Sheet
// (sheet.tsx) and the confirmation ActionSheet (action-sheet.tsx). Nothing
// here draws anything app-specific.

// How long the slide in/out takes. Must match the duration-300 class used
// by Sheet and ActionSheet.
export const OVERLAY_DURATION_MS = 300;

// Keeps an overlay on screen long enough to animate out. Returns `mounted`
// (whether to render it at all) and `visible` (whether it's in its "shown"
// position). Opening: mount first, then flip to visible one frame later so
// the browser has a starting position to slide from. Closing: flip to
// hidden, then unmount once the slide-out has finished.
export function usePresence(open: boolean) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);

  // Opening: put it on the page right away. (Updating state while rendering,
  // based on a prop, is React's recommended way to do this.)
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      // Two nested frames: the first lets the browser draw the overlay in
      // its hidden position, the second starts the slide from there.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    // Closing: take it off the page once the slide-out has finished.
    const timer = setTimeout(() => {
      setMounted(false);
      setEntered(false);
    }, OVERLAY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [open]);

  // It's in its shown position only while open -- so closing starts the
  // slide-out immediately.
  return { mounted, visible: open && entered };
}

// While `active`, stops the page behind an overlay from scrolling, and
// restores it afterwards.
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = previous;
    };
  }, [active]);
}

// While `active`, calls `onEscape` when the Escape key is pressed. (There's
// no Escape key on a phone; this is for testing on a desktop browser.)
export function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active, onEscape]);
}

// How many pixels of the bottom of the screen the iPhone's on-screen
// keyboard is covering right now (0 when it's closed). The keyboard doesn't
// shrink the page on an iPhone, it just covers it, so anything pinned to
// the bottom of the screen would end up hidden behind it. The browser's
// "visualViewport" is the part of the page actually visible above the
// keyboard; the gap between that and the full window is the keyboard.
export function useKeyboardInset(active: boolean) {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!active || !viewport) return;
    const update = () =>
      setInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      setInset(0);
    };
  }, [active]);

  return inset;
}

// Renders its children directly inside <body> instead of wherever the
// component sits in the page. Overlays need this: anything they're nested
// inside that moves (e.g. a swiped list row, which uses a CSS transform)
// would otherwise drag the "fixed to the screen" overlay along with it.
export function Portal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}
