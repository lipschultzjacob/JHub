"use client";

import { useRef, useState } from "react";
import { formatMoney, formatShortDate } from "@/lib/format-money";

export type DeckTransaction = {
  id: number;
  merchant: string;
  amount: string;
  date: string;
  accountName: string;
  pending: boolean;
};

// How far a finger has to move before we decide whether it's a sideways
// swipe (ours) or an up/down move (ignored).
const MOVE_TOLERANCE = 8;
// How long a card takes to fly off / settle back.
const FLY_MS = 300;
const SETTLE = "cubic-bezier(0.32, 0.72, 0, 1)";
// How the cards underneath the top one sit: each step back is a bit smaller
// and a bit lower, so their bottom edges show like a real deck.
const DEPTH_SCALE = 0.05;
const DEPTH_DROP = 14; // px
const CARD_RADIUS = 28;

// Overview's deck of transaction cards, stacked like a real deck: swipe the
// top card off to the left for the next one, swipe right to bring the
// previous one back.
//
// `emptyState` is shown when there are no cards. `initialTransactionId`
// picks which card starts on top (used when opened from a notification).
//
// The card shapes, shadows and motion use inline styles on purpose: they
// render the same everywhere, including on the iPhone, where some
// class-based styles have come through differently.
export function SortDeck({
  transactions,
  emptyState,
  initialTransactionId,
}: {
  transactions: DeckTransaction[];
  emptyState: React.ReactNode;
  initialTransactionId?: number;
}) {
  // Which card is on top. Starts on the notification's transaction when
  // opened from one (/#transaction-<id>), otherwise the first.
  const [index, setIndex] = useState(() =>
    Math.max(0, transactions.findIndex((t) => t.id === initialTransactionId))
  );
  const current = Math.min(index, Math.max(0, transactions.length - 1));

  // "swiping": following a sideways drag.
  const [mode, setMode] = useState<"idle" | "swiping">("idle");
  const [dragX, setDragX] = useState(0);
  // Set for the moment a card is flying off ("next") or the previous card
  // is flying back on ("prev"), before the top card actually changes.
  const [flying, setFlying] = useState<"next" | "prev" | null>(null);
  const [deckWidth, setDeckWidth] = useState(360);

  // The touch in progress: where and when it started, and what it has
  // turned out to be ("pending" until it has moved far enough to tell).
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    t: number;
    kind: "pending" | "swipe" | "ignore";
  } | null>(null);

  // Finger down on the deck: remember where and when. Nothing moves yet.
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (mode !== "idle" || flying || e.button !== 0 || transactions.length === 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDeckWidth(e.currentTarget.offsetWidth);
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, kind: "pending" };
  }

  // Finger moving: a clear sideways move becomes a swipe (an up/down one is
  // ignored). While swiping, the cards follow the finger.
  function handlePointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.kind === "pending" && Math.hypot(dx, dy) > MOVE_TOLERANCE) {
      g.kind = Math.abs(dx) > Math.abs(dy) ? "swipe" : "ignore";
      if (g.kind === "swipe") setMode("swiping");
    }
    if (g.kind === "swipe") {
      // Resist when there's nothing to go to in that direction.
      const blocked = (current === 0 && dx > 0) || (current === transactions.length - 1 && dx < 0);
      setDragX(blocked ? dx * 0.3 : dx);
    }
  }

  // Finger up: a swipe that went far or fast enough flies the top card off
  // (next) or brings the previous card back (prev), otherwise everything
  // settles back.
  function handlePointerEnd(e: React.PointerEvent) {
    const g = gesture.current;
    gesture.current = null;
    if (!g || e.pointerId !== g.id) return;
    const released = e.type === "pointerup";

    if (g.kind === "swipe") {
      const dx = e.clientX - g.x;
      const speed = dx / Math.max(1, e.timeStamp - g.t); // px per ms
      const goNext = released && current < transactions.length - 1 && (dx < -deckWidth * 0.25 || speed < -0.5);
      const goPrev = released && current > 0 && (dx > deckWidth * 0.25 || speed > 0.5);
      if (goNext || goPrev) {
        setFlying(goNext ? "next" : "prev");
        setTimeout(() => {
          setIndex(current + (goNext ? 1 : -1));
          setFlying(null);
          setDragX(0);
        }, FLY_MS);
      } else {
        setDragX(0);
      }
    }
    setMode("idle");
  }

  // Where each card sits. `r` is its place relative to the top card (0 =
  // top, 1 = just under it, -1 = the previous card, waiting off to the left).
  // While swiping left the cards underneath rise toward the top (leftP goes
  // 0 -> 1); while swiping right the previous card slides in over the top
  // and the rest sink back a step (rightP).
  const leftP = flying === "next" ? 1 : flying === "prev" ? 0 : Math.min(1, Math.max(0, -dragX / deckWidth));
  const rightP = flying === "prev" ? 1 : flying === "next" ? 0 : Math.min(1, Math.max(0, dragX / deckWidth));
  const animate = mode !== "swiping";
  function cardPlacement(r: number): { style: React.CSSProperties; depth: number } {
    let x = "0px";
    let rotate = 0;
    let depth = Math.max(0, r - leftP + (current > 0 ? rightP : 0));
    let opacity = depth > 2.5 ? 0 : 1;
    if (r === 0 && (dragX < 0 || flying === "next")) {
      // The top card leaving to the left, tilting as it goes.
      x = flying === "next" ? "-130%" : `${dragX}px`;
      rotate = flying === "next" ? -14 : dragX * 0.04;
      depth = 0;
    } else if (r === 0 && dragX > 0 && current === 0) {
      x = `${dragX}px`; // nothing before it: just a little resistance
      depth = 0;
    } else if (r === -1) {
      // The previous card, off to the left until you swipe right.
      x = flying === "prev" ? "0px" : `calc(-130% + ${Math.max(0, dragX)}px)`;
      rotate = flying === "prev" ? 0 : -14 * (1 - rightP);
      depth = 0;
      opacity = rightP > 0 || flying === "prev" ? 1 : 0;
    }
    const style: React.CSSProperties = {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: r === -1 ? 20 : 10 - r,
      transform: `translateX(${x}) translateY(${depth * DEPTH_DROP}px) scale(${1 - depth * DEPTH_SCALE}) rotate(${rotate}deg)`,
      transformOrigin: "50% 100%",
      opacity,
      transition: animate ? `transform ${FLY_MS}ms ${SETTLE}, opacity ${FLY_MS}ms` : "none",
    };
    return { style, depth };
  }

  // The cards worth drawing: the previous one (waiting off to the left), the
  // top one, and three underneath.
  const drawn = transactions.map((t, i) => ({ t, r: i - current })).filter(({ r }) => r >= -1 && r <= 3);

  if (transactions.length === 0) return <>{emptyState}</>;

  return (
    <div className="flex flex-col items-center gap-1.75">
      {/* touch-action: none -- this area's touches are all ours, so the
          browser never scrolls the page in the middle of a swipe. */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: "relative",
          width: "86%",
          height: "clamp(300px, 50vh, 440px)",
          marginBottom: DEPTH_DROP * 2,
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
      >
        {/* Drawn back to front, so the top card ends up on top. */}
        {[...drawn].reverse().map(({ t, r }) => {
          const { style, depth } = cardPlacement(r);
          return (
            <div key={t.id} style={style}>
              <TransactionCard tx={t} depth={depth} animate={animate} />
            </div>
          );
        })}
      </div>
      <p className="m-0 text-center text-footnote text-text-secondary">
        {current + 1} of {transactions.length}
      </p>
    </div>
  );
}

// One transaction card in the deck: date and account on top, the amount
// large in the middle (money in green with "+"), the merchant under it, and
// a soft "Pending" pill if it hasn't cleared. Cards further back in the deck
// (`depth`) are shaded darker -- mostly visible in Dark mode, where shadows
// can't show the depth (see --deck-shade in globals.css).
function TransactionCard({
  tx,
  depth,
  animate,
}: {
  tx: DeckTransaction;
  depth: number;
  animate: boolean;
}) {
  const amount = formatMoney(tx.amount);
  return (
    <div
      className="flex h-full flex-col items-center justify-between px-5 py-7 text-center"
      style={{
        position: "relative",
        borderRadius: CARD_RADIUS,
        background: "var(--color-surface-elevated)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <span className="text-subheadline text-text-secondary">
        {formatShortDate(tx.date)} · {tx.accountName}
      </span>
      <div className="flex min-w-0 max-w-full flex-col items-center gap-1.5">
        <span
          className={`tabular-nums ${amount.isIncome ? "text-green" : ""}`}
          style={{ fontSize: 46, lineHeight: "54px", fontWeight: 600, letterSpacing: "-0.02em" }}
        >
          {amount.text}
        </span>
        <span className="max-w-full truncate text-title3 font-medium">{tx.merchant}</span>
      </div>
      <span
        className="text-footnote text-text-secondary"
        style={{
          visibility: tx.pending ? "visible" : "hidden",
          padding: "4px 12px",
          borderRadius: 999,
          background: "var(--color-switch-off)",
        }}
      >
        Pending
      </span>
      {/* The depth shading: a black layer over the card, more opaque the
          further back the card sits. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          borderRadius: CARD_RADIUS,
          background: "#000000",
          pointerEvents: "none",
          opacity: `calc(var(--deck-shade) * ${depth})`,
          transition: animate ? `opacity ${FLY_MS}ms` : "none",
        }}
      />
    </div>
  );
}
