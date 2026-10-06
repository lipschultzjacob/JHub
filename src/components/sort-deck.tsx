"use client";

import { useRef, useState } from "react";
import { formatMoney, formatShortDate } from "@/lib/format-money";
import { UndoBanner } from "@/components/undo-banner";
import type { ReviewStatus } from "@/db/schema";

export type DeckTransaction = {
  id: number;
  merchant: string;
  amount: string;
  date: string;
  accountName: string;
  pending: boolean;
};

// Which way each decision goes: swiping left marks a transaction for
// reimbursement, swiping right clears it.
const SWIPE_LEFT: ReviewStatus = "reimburse";
const SWIPE_RIGHT: ReviewStatus = "clear";
// How each decision is shown: its name in the hint under the deck, and the
// Undo banner's wording.
const LABELS: Record<ReviewStatus, { name: string; banner: string }> = {
  reimburse: { name: "Reimburse", banner: "Marked for reimbursement" },
  clear: { name: "Clear", banner: "Cleared" },
};

// How far a finger has to move before we decide whether it's a sideways
// swipe (ours) or an up/down move (ignored).
const MOVE_TOLERANCE = 8;
// How long the "Cleared · Undo" banner stays up.
const UNDO_MS = 5000;
// How long a card takes to fly off / settle back.
const FLY_MS = 300;
const SETTLE = "cubic-bezier(0.32, 0.72, 0, 1)";
// How the cards underneath the top one sit: each step back is a bit smaller
// and a bit lower, so their bottom edges show like a real deck.
const DEPTH_SCALE = 0.05;
const DEPTH_DROP = 14; // px
const CARD_RADIUS = 28;

// Overview's review deck: transactions you haven't reviewed yet, stacked
// like a real deck of cards.
// - Swipe the top card left to mark it for reimbursement, or right to clear
//   it (nothing more to do). Either way it leaves the deck, and the next
//   card comes up.
// - The hint under the deck ("← Reimburse · Clear →") follows the drag: the
//   side you're heading toward turns tinted and bold while the other fades,
//   and it grows a little once letting go would commit.
// - After each swipe, an "… · Undo" banner shows for a few seconds; Undo
//   puts the card back on top.
//
// `review` saves a transaction's status (null = back to unreviewed) and
// returns an error message, or null on success. The card is hidden right
// away and comes back if saving fails. `emptyState` is shown when no cards
// are left. `initialTransactionId` picks which card starts on top (used
// when opened from a notification).
//
// The card shapes, shadows and motion use inline styles on purpose: they
// render the same everywhere, including on the iPhone, where some
// class-based styles have come through differently.
export function SortDeck({
  transactions,
  review,
  emptyState,
  initialTransactionId,
}: {
  transactions: DeckTransaction[];
  review: (transactionId: number, status: ReviewStatus | null) => Promise<string | null>;
  emptyState: React.ReactNode;
  initialTransactionId?: number;
}) {
  // Transactions reviewed on this screen, hidden right away (and shown again
  // if saving fails or Undo is tapped).
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);
  const visible = transactions.filter((t) => !hiddenIds.includes(t.id));

  // Which card is on top. Starts on the notification's transaction when
  // opened from one (/#transaction-<id>), otherwise the first. When the top
  // card is swiped away, the one after it slides into the same position.
  const [index, setIndex] = useState(() =>
    Math.max(0, transactions.findIndex((t) => t.id === initialTransactionId))
  );
  const current = Math.min(index, Math.max(0, visible.length - 1));

  // "swiping": following a sideways drag.
  const [mode, setMode] = useState<"idle" | "swiping">("idle");
  const [dragX, setDragX] = useState(0);
  // Set for the moment the top card is flying off to one side, before it's
  // actually removed from the deck.
  const [flying, setFlying] = useState<"left" | "right" | null>(null);
  const [deckWidth, setDeckWidth] = useState(360);
  const [undo, setUndo] = useState<{ tx: DeckTransaction; status: ReviewStatus } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The touch in progress: where and when it started, and what it has
  // turned out to be ("pending" until it has moved far enough to tell).
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    t: number;
    kind: "pending" | "swipe" | "ignore";
  } | null>(null);

  // Hides a card, shows the Undo banner, and saves its review status; brings
  // the card back with an error if saving fails.
  async function decide(tx: DeckTransaction, status: ReviewStatus) {
    setError(null);
    setHiddenIds((ids) => [...ids, tx.id]);
    setUndo({ tx, status });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
    const problem = await review(tx.id, status);
    if (problem) {
      setHiddenIds((ids) => ids.filter((id) => id !== tx.id));
      setUndo(null);
      setError(problem);
    }
  }

  // Undo: puts the last reviewed card back on top of the deck, in its
  // original place in the order, and marks it unreviewed again.
  async function undoLast() {
    if (!undo) return;
    const { tx } = undo;
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const restored = transactions.filter((t) => t.id === tx.id || !hiddenIds.includes(t.id));
    setHiddenIds((ids) => ids.filter((id) => id !== tx.id));
    setIndex(restored.findIndex((t) => t.id === tx.id));
    const problem = await review(tx.id, null);
    if (problem) setError(problem);
  }

  // Finger down on the deck: remember where and when. Nothing moves yet.
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (mode !== "idle" || flying || e.button !== 0 || visible.length === 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDeckWidth(e.currentTarget.offsetWidth);
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, kind: "pending" };
  }

  // Finger moving: a clear sideways move becomes a swipe (an up/down one is
  // ignored). While swiping, the top card follows the finger.
  function handlePointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.kind === "pending" && Math.hypot(dx, dy) > MOVE_TOLERANCE) {
      g.kind = Math.abs(dx) > Math.abs(dy) ? "swipe" : "ignore";
      if (g.kind === "swipe") setMode("swiping");
    }
    if (g.kind === "swipe") setDragX(dx);
  }

  // Finger up: a swipe that went far or fast enough flies the top card off
  // that side and records the decision; otherwise it settles back.
  function handlePointerEnd(e: React.PointerEvent) {
    const g = gesture.current;
    gesture.current = null;
    if (!g || e.pointerId !== g.id) return;
    const released = e.type === "pointerup";

    if (g.kind === "swipe") {
      const dx = e.clientX - g.x;
      const speed = dx / Math.max(1, e.timeStamp - g.t); // px per ms
      const goLeft = released && (dx < -deckWidth * 0.25 || speed < -0.5);
      const goRight = released && (dx > deckWidth * 0.25 || speed > 0.5);
      const tx = visible[current];
      if (tx && (goLeft || goRight)) {
        setFlying(goLeft ? "left" : "right");
        setTimeout(() => {
          decide(tx, goLeft ? SWIPE_LEFT : SWIPE_RIGHT);
          setFlying(null);
          setDragX(0);
        }, FLY_MS);
      } else {
        setDragX(0);
      }
    }
    setMode("idle");
  }

  // How far along the current swipe is, 0 -> 1 (1 = a full card width, or
  // the card flying off). The cards underneath rise toward the top as it
  // grows.
  const progress = flying ? 1 : Math.min(1, Math.abs(dragX) / deckWidth);
  const animate = mode !== "swiping";
  // Where each card sits. `r` is its place relative to the top card (0 =
  // top, 1 = just under it, ...).
  function cardPlacement(r: number): { style: React.CSSProperties; depth: number } {
    let x = "0px";
    let rotate = 0;
    let depth = Math.max(0, r - progress);
    if (r === 0) {
      // The top card follows the finger, tilting as it goes, and flies off
      // past the edge once a swipe commits.
      x = flying === "left" ? "-130%" : flying === "right" ? "130%" : `${dragX}px`;
      rotate = flying === "left" ? -14 : flying === "right" ? 14 : dragX * 0.04;
      depth = 0;
    }
    const style: React.CSSProperties = {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 10 - r,
      transform: `translateX(${x}) translateY(${depth * DEPTH_DROP}px) scale(${1 - depth * DEPTH_SCALE}) rotate(${rotate}deg)`,
      transformOrigin: "50% 100%",
      opacity: depth > 2.5 ? 0 : 1,
      transition: animate ? `transform ${FLY_MS}ms ${SETTLE}, opacity ${FLY_MS}ms` : "none",
    };
    return { style, depth };
  }

  // How far the drag has gone toward each side, 0 -> 1, reaching 1 at the
  // commit distance (25% of the width). Drives the hint under the deck. (A
  // fast flick can also commit before that -- the hint just shows the
  // distance.)
  const toward = (side: "left" | "right") =>
    flying === side ? 1 : flying ? 0 : Math.min(1, Math.max(0, (side === "left" ? -dragX : dragX) / (deckWidth * 0.25)));

  // The cards worth drawing: the top one and three underneath.
  const drawn = visible.map((t, i) => ({ t, r: i - current })).filter(({ r }) => r >= 0 && r <= 3);

  return (
    <>
      {visible.length === 0 ? (
        emptyState
      ) : (
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
            {visible.length} to review
          </p>
          <p className="m-0 flex items-center justify-center gap-1.5 text-footnote text-text-secondary">
            <HintSide text={`← ${LABELS[SWIPE_LEFT].name}`} toward={toward("left")} away={toward("right")} animate={animate} />
            <span style={{ opacity: 1 - 0.8 * Math.max(toward("left"), toward("right")) }}>·</span>
            <HintSide text={`${LABELS[SWIPE_RIGHT].name} →`} toward={toward("right")} away={toward("left")} animate={animate} />
          </p>
          {error && <p className="m-0 text-center text-footnote text-red">{error}</p>}
        </div>
      )}

      {/* "Marked for reimbursement · Undo", just above the tab bar. */}
      {undo && <UndoBanner message={LABELS[undo.status].banner} onUndo={undoLast} />}
    </>
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

// One side of the hint under the deck ("← Reimburse" or "Clear →").
// `toward` is how far the drag has gone toward this side and `away` how far
// toward the other, each 0 -> 1. Leaning this way, it turns tinted and bold,
// and at the commit distance (1) it grows slightly; leaning the other way, it
// fades out. A bold copy of the text is kept invisibly underneath, so
// switching to bold doesn't make it wider and nudge the rest of the hint.
function HintSide({
  text,
  toward,
  away,
  animate,
}: {
  text: string;
  toward: number;
  away: number;
  animate: boolean;
}) {
  const leaning = toward > 0;
  return (
    <span
      className={`inline-grid ${leaning ? "text-accent" : ""}`}
      style={{
        opacity: 1 - 0.8 * away,
        transform: `scale(${toward >= 1 ? 1.15 : 1})`,
        transition: `color 120ms, transform 160ms ${SETTLE}${animate ? `, opacity ${FLY_MS}ms` : ""}`,
      }}
    >
      <span aria-hidden className="invisible col-start-1 row-start-1 font-semibold">
        {text}
      </span>
      <span className={`col-start-1 row-start-1 text-center ${leaning ? "font-semibold" : ""}`}>{text}</span>
    </span>
  );
}
