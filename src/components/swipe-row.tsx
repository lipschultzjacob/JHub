"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { rowSeparatorClass } from "@/components/grouped-list";

// How far you have to swipe before letting go asks to delete: 30% of the
// row's width, but never less than 80px or more than 140px.
const THRESHOLD_SHARE = 0.3;
const MIN_THRESHOLD = 80;
const MAX_THRESHOLD = 140;
// How far a finger has to move before we decide whether it's a sideways
// swipe (ours) or an up/down scroll (the browser's).
const DECIDE_DISTANCE = 8;

// Wraps one ListRow so it can be swiped left to delete it:
//   <SwipeToDelete onDelete={() => setConfirming(item)} held={confirming?.id === item.id}>
//     <ListRow title="Groceries" chevron href="/categories/3" />
//   </SwipeToDelete>
// As you swipe, a red panel with a trash can grows in from the right. Let go
// past the threshold (the trash can turns fully solid) and onDelete runs --
// normally opening an "are you sure?" alert. Let go before it and the row
// springs back. While `held` is true (the alert is up), the row stays
// swiped open showing the red panel; when it turns false it springs back.
// Up/down finger movement is left alone so the page scrolls normally.
export function SwipeToDelete({
  onDelete,
  held = false,
  children,
}: {
  onDelete: () => void;
  held?: boolean;
  children: React.ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // How far left the row is dragged right now (0 or negative). Only
  // meaningful while dragging; at rest the position comes from `held`.
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [threshold, setThreshold] = useState(MIN_THRESHOLD);
  // The in-progress touch: where it started, and whether it's been judged a
  // sideways swipe ("h") or a scroll ("v") yet.
  const gesture = useRef<{ id: number; x: number; y: number; kind: "h" | "v" | null } | null>(null);
  // The latest drag position, readable in the finger-up handler.
  const latestOffset = useRef(0);
  // Set after a swipe so a click the browser sends at the end of it doesn't
  // also open the row's link. Reset at the start of every new touch.
  const swallowClick = useRef(false);

  // Where the row is drawn: following the finger while dragging, held open
  // at the threshold while the alert is up, otherwise closed.
  const offset = dragging ? dragOffset : held ? -threshold : 0;
  const armed = -offset >= threshold;

  // Finger (or mouse) down: remember where, but don't move anything yet.
  function handlePointerDown(e: React.PointerEvent) {
    swallowClick.current = false;
    if (e.button !== 0 || held) return;
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, kind: null };
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
      if (Math.abs(dy) >= Math.abs(dx) || dx > 0) {
        g.kind = "v"; // a scroll (or a swipe to the right) -- leave it alone
        return;
      }
      g.kind = "h";
      const width = wrapperRef.current?.offsetWidth ?? 0;
      setThreshold(Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, width * THRESHOLD_SHARE)));
      setDragging(true);
      // Keep receiving this finger's moves even if it slides off the row.
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    swallowClick.current = true;
    latestOffset.current = Math.min(0, dx);
    setDragOffset(latestOffset.current);
  }

  // Finger up: if it was let go past the threshold, ask to delete;
  // either way stop following the finger (the row then settles into its
  // held-open or closed position).
  function handlePointerEnd(e: React.PointerEvent) {
    const g = gesture.current;
    gesture.current = null;
    if (!g || e.pointerId !== g.id || g.kind !== "h") return;
    setDragging(false);
    if (e.type === "pointerup" && -latestOffset.current >= threshold) onDelete();
  }

  // Stops the click the browser may send at the end of a swipe from also
  // following the row's link or pressing its button.
  function handleClickCapture(e: React.MouseEvent) {
    if (swallowClick.current) {
      e.preventDefault();
      e.stopPropagation();
      swallowClick.current = false;
    }
  }

  // Sliding animation for when the row settles (not while following a finger).
  const settle = dragging ? "none" : "transform 300ms cubic-bezier(0.32, 0.72, 0, 1), width 300ms cubic-bezier(0.32, 0.72, 0, 1)";

  return (
    // overflow-hidden clips the red panel until the row slides over.
    <div ref={wrapperRef} className={`relative overflow-hidden ${rowSeparatorClass}`}>
      {/* One horizontal strip: the row (full width) with the red panel right
          after it, off the right edge. Sliding the strip left pulls the panel
          into view. The panel's width is how far the row has been pulled, so
          its trash can stays centered in the red that's showing. Plain inline
          styles rather than utility classes, so this works the same in every
          browser version. */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()} // no dragging the row's link like a desktop link
        style={{
          display: "flex",
          transform: `translateX(${offset}px)`,
          transition: settle,
          // pan-y: the browser still handles up/down scrolling itself, but
          // leaves sideways movement to us.
          touchAction: "pan-y",
          userSelect: "none",
          WebkitUserSelect: "none",
          // No iPhone long-press link preview while swiping.
          WebkitTouchCallout: "none",
          // While swiping, the row shouldn't also look "pressed".
          ...(dragging ? { ["--row-pressed" as string]: "var(--color-surface)" } : {}),
        }}
      >
        <div style={{ flex: "0 0 100%", minWidth: 0 }}>{children}</div>
        <div
          aria-hidden
          className="flex items-center justify-center bg-red text-white"
          style={{ flex: "0 0 auto", width: -offset, transition: settle, overflow: "hidden" }}
        >
          {/* Grows in as you pull, and turns fully solid once letting go
              would delete. */}
          <Trash2
            size={22}
            strokeWidth={2}
            style={{
              flexShrink: 0,
              opacity: armed ? 1 : 0.55,
              transform: `scale(${armed ? 1 : Math.max(0.6, Math.min(1, -offset / threshold))})`,
              transition: "opacity 150ms, transform 150ms",
            }}
          />
        </div>
      </div>
    </div>
  );
}
