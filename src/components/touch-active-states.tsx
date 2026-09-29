"use client";

import { useEffect } from "react";

// Makes pressed-state styles (Tailwind's "active:" classes, e.g. a list
// row darkening while your finger is on it) actually show on iPhones.
// iPhone Safari only applies the CSS :active state if the page is listening
// for touches -- a long-standing Safari quirk. Adding one empty, passive
// "touchstart" listener to the whole page is the standard fix; it does
// nothing else and doesn't slow scrolling. Renders nothing.
export function TouchActiveStates() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);

  return null;
}
