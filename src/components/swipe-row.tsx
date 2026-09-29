"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { rowSeparatorClass } from "@/components/grouped-list";

export type SwipeAction = {
  label: string;
  onPress: () => void;
};

// Width of each revealed action button, and how far (as a share of the
// row's width) you have to drag for a "full swipe" that triggers the first
// action without tapping it -- both close to what iOS uses.
const ACTION_WIDTH = 80;
const FULL_SWIPE_SHARE = 0.6;
// How far a finger has to move before we decide whether it's a sideways
// swipe (ours) or an up/down scroll (the browser's).
const DECIDE_DISTANCE = 8;

// Only one row can be swiped open at a time; this closes whichever one is.
let closeOpenRow: (() => void) | null = null;

// Wraps one ListRow so it can be dragged left to reveal red action buttons
// (e.g. Delete), like rows in Mail or Messages:
//   <SwipeRow actions={[{ label: "Delete", onPress: () => confirmDelete() }]}>
//     <ListRow title="Groceries" chevron href="/categories/3" />
//   </SwipeRow>
// Drag part-way and let go past halfway to leave it open; drag most of the
// way across (a "full swipe") to trigger the first action directly. Tapping
// anywhere else, or starting to swipe another row, closes it. Up/down
// finger movement is left alone so the page still scrolls normally.
// Pressing an action also closes the row; if the action asks for
// confirmation (an ActionSheet), that shows over the closed row.
export function SwipeRow({
  actions,
  children,
}: {
  actions: SwipeAction[];
  children: React.ReactNode;
}) {
  // How far left the row is currently pushed, in pixels (0 = closed, negative = open).
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // The same position, readable inside event handlers without waiting for
  // a re-render. Always changed together with `offset`, via move().
  const offsetRef = useRef(0);
  // The in-progress touch: where it started, the row's position then, and
  // whether it's been judged a sideways swipe ("h") or a scroll ("v") yet.
  const gesture = useRef<{ id: number; x: number; y: number; base: number; kind: "h" | "v" | null } | null>(null);
  // Set after a swipe so the tap that ends it doesn't also open the row's link.
  const swallowClick = useRef(false);

  const openWidth = ACTION_WIDTH * actions.length;

  // Sets the row's position (and the handler-readable copy of it).
  const move = useCallback((next: number) => {
    offsetRef.current = next;
    setOffset(next);
  }, []);
  const close = useCallback(() => move(0), [move]);

  // While this row is open: register it as the one open row, and close it
  // when the user touches anywhere outside it.
  useEffect(() => {
    if (offset === 0 || dragging) return;
    if (closeOpenRow && closeOpenRow !== close) closeOpenRow();
    closeOpenRow = close;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      if (closeOpenRow === close) closeOpenRow = null;
    };
  }, [offset, dragging, close]);

  // Finger (or mouse) down: remember where, but don't move anything yet.
  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, base: offsetRef.current, kind: null };
  }

  // Finger moving: first decide sideways vs. up/down, then (if sideways)
  // move the row with the finger. It can't be pushed right past closed.
  function handlePointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id || g.kind === "v") return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.kind === null) {
      if (Math.abs(dx) < DECIDE_DISTANCE && Math.abs(dy) < DECIDE_DISTANCE) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        g.kind = "v"; // a scroll -- leave it to the browser
        return;
      }
      g.kind = "h";
      setDragging(true);
      // Keep receiving this finger's moves even if it slides off the row.
      e.currentTarget.setPointerCapture(e.pointerId);
      if (closeOpenRow && closeOpenRow !== close) closeOpenRow();
    }
    swallowClick.current = true;
    move(Math.min(0, g.base + dx));
  }

  // Finger up: settle into fully open, closed, or trigger a full swipe.
  function handlePointerEnd(e: React.PointerEvent) {
    const g = gesture.current;
    gesture.current = null;
    if (!g || e.pointerId !== g.id || g.kind !== "h") return;
    setDragging(false);
    const width = wrapperRef.current?.offsetWidth ?? 0;
    const current = offsetRef.current;
    if (e.type === "pointerup" && current < -width * FULL_SWIPE_SHARE) {
      // Full swipe: slide all the way across, then run the first action.
      move(-width);
      setTimeout(() => {
        move(0);
        actions[0]?.onPress();
      }, 200);
    } else {
      move(current < -openWidth / 2 ? -openWidth : 0);
    }
  }

  // Stops the row's link or button from firing when it shouldn't:
  // - the "click" the browser sends as the finger lifts at the end of a
  //   swipe is simply swallowed (the row stays where the swipe left it);
  // - a real tap on a row that's already open just closes it.
  function handleClickCapture(e: React.MouseEvent) {
    if (swallowClick.current) {
      e.preventDefault();
      e.stopPropagation();
      swallowClick.current = false;
    } else if (offsetRef.current !== 0) {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  }

  // How much of the action area is showing. During a full swipe the first
  // action stretches to fill the whole revealed width, as on iOS.
  const revealed = Math.max(openWidth, -offset);

  return (
    <div ref={wrapperRef} className={`relative overflow-hidden ${rowSeparatorClass}`}>
      {/* The action buttons, sitting behind the row. Fully hidden while the
          row is closed -- after the 300ms slide-back finishes -- so no red
          can peek out at the section's rounded corners. */}
      <div
        className={`absolute inset-y-0 right-0 flex ${
          offset === 0 ? "invisible [transition:visibility_0s_300ms]" : "visible"
        }`}
        style={{ width: revealed }}
        aria-hidden={offset === 0}
      >
        {actions.map((action, i) => (
          <button
            key={action.label}
            type="button"
            tabIndex={offset === 0 ? -1 : 0}
            onClick={() => {
              close();
              action.onPress();
            }}
            className={`${i === 0 ? "flex-1" : "w-20"} bg-red text-body text-white active:opacity-80`}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()} // no dragging the row's link like a desktop link
        // pan-y: the browser still handles up/down scrolling itself, but
        // leaves sideways movement to us. While swiping, --row-pressed is
        // switched off so the row doesn't also look "pressed".
        style={{
          transform: `translateX(${offset}px)`,
          ...(dragging ? { ["--row-pressed" as string]: "var(--color-surface)" } : {}),
        }}
        className={`relative touch-pan-y select-none ${dragging ? "" : "transition-transform duration-300 ease-ios"}`}
      >
        {children}
      </div>
    </div>
  );
}
