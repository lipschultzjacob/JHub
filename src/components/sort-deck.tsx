"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { Portal } from "@/components/overlay";
import { Sheet } from "@/components/sheet";
import { ListSection, ListRow } from "@/components/grouped-list";
import { formatMoney, formatShortDate } from "@/lib/format-money";

export type DeckTransaction = {
  id: number;
  merchant: string;
  amount: string;
  date: string;
  accountName: string;
  pending: boolean;
};
export type DeckCategory = { id: number; name: string };

// How long a finger has to stay still on the top card before sorting starts.
const HOLD_MS = 400;
// How far a finger can drift during that hold and still count as "still".
const MOVE_TOLERANCE = 8;
// The sorting grid is always 3 rows x 2 columns. With more categories than
// cells, the last cell becomes "More…" (a list of the rest).
const GRID_CELLS = 6;
// How long the "Sorted into … · Undo" banner stays up.
const UNDO_MS = 5000;
// How long a card takes to fly off / settle back.
const FLY_MS = 300;
const SETTLE = "cubic-bezier(0.32, 0.72, 0, 1)";
// How the cards underneath the top one sit: each step back is a bit smaller
// and a bit lower, so their bottom edges show like a real deck.
const DEPTH_SCALE = 0.05;
const DEPTH_DROP = 14; // px
const CARD_RADIUS = 28;

// What's under the finger while sorting: a category cell ("c:<id>"),
// "more", "cancel" (the ✕), or nothing.
type DropKey = string | null;

// Which drop target (if any) is at a point on the screen. Every target in
// the grid carries a data-drop attribute; the floating card under the
// finger has pointer-events: none so it doesn't get in the way.
function dropAt(x: number, y: number): DropKey {
  const el = document.elementFromPoint(x, y)?.closest("[data-drop]");
  return el?.getAttribute("data-drop") ?? null;
}

// Overview's deck for sorting transactions into categories:
// - transaction cards stacked like a deck: swipe the top card off to the
//   left for the next one, swipe right to bring the previous one back;
// - press and hold the top card and the screen becomes a 3x2 grid of
//   categories; drag onto one (it lights up) and let go to sort the
//   transaction into it. The small ✕ in the middle cancels. "More…" (when
//   there are more categories than cells) opens a list of the rest.
// A sorted card disappears instantly, and a "Sorted into … · Undo" banner
// shows for a few seconds.
//
// `categories` should already be in grid order (most-used first). `assign`
// saves a transaction's category (null = back to unsorted) and returns an
// error message, or null on success. `emptyState` is shown when no cards
// are left.
//
// The card shapes, shadows and motion use inline styles on purpose: they
// render the same everywhere, including on the iPhone, where some
// class-based styles have come through differently.
export function SortDeck({
  transactions,
  categories,
  assign,
  emptyState,
  initialTransactionId,
}: {
  transactions: DeckTransaction[];
  categories: DeckCategory[];
  assign: (transactionId: number, categoryId: number | null) => Promise<string | null>;
  emptyState: React.ReactNode;
  initialTransactionId?: number;
}) {
  // Transactions sorted on this screen, hidden right away (and shown again
  // if saving fails or Undo is tapped).
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);
  const visible = transactions.filter((t) => !hiddenIds.includes(t.id));

  // Which card is on top. Starts on the notification's transaction when
  // opened from one (/#transaction-<id>), otherwise the first.
  const [index, setIndex] = useState(() =>
    Math.max(0, transactions.findIndex((t) => t.id === initialTransactionId))
  );
  const current = Math.min(index, Math.max(0, visible.length - 1));

  // "swiping": following a sideways drag. "sorting": the grid is up.
  const [mode, setMode] = useState<"idle" | "swiping" | "sorting">("idle");
  const [dragX, setDragX] = useState(0);
  // Set for the moment a card is flying off ("next") or the previous card
  // is flying back on ("prev"), before the top card actually changes.
  const [flying, setFlying] = useState<"next" | "prev" | null>(null);
  const [deckWidth, setDeckWidth] = useState(360);
  const [finger, setFinger] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<DropKey>(null);
  const [moreFor, setMoreFor] = useState<DeckTransaction | null>(null);
  const [undo, setUndo] = useState<{ tx: DeckTransaction; categoryName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The touch in progress: where and when it started, where it is now,
  // and what it has turned out to be.
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    t: number;
    lastX: number;
    lastY: number;
    timer: ReturnType<typeof setTimeout> | null;
    kind: "pending" | "swipe" | "sort" | "ignore";
  } | null>(null);

  // The grid: up to 6 categories, or 5 + "More…" when there are more.
  const needsMore = categories.length > GRID_CELLS;
  const cellCategories = categories.slice(0, needsMore ? GRID_CELLS - 1 : GRID_CELLS);
  const moreCategories = needsMore ? categories.slice(GRID_CELLS - 1) : [];
  const cells: ({ key: string; label: string } | null)[] = [
    ...cellCategories.map((c) => ({ key: `c:${c.id}`, label: c.name })),
    ...(needsMore ? [{ key: "more", label: "More…" }] : []),
  ];
  while (cells.length < GRID_CELLS) cells.push(null); // empty cells keep the 3x2 shape

  // Hides a card, shows the Undo banner, and saves its new category; brings
  // the card back with an error if saving fails.
  async function sortInto(tx: DeckTransaction, categoryId: number) {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    setError(null);
    setHiddenIds((ids) => [...ids, tx.id]);
    setUndo({ tx, categoryName: category.name });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
    const problem = await assign(tx.id, categoryId);
    if (problem) {
      setHiddenIds((ids) => ids.filter((id) => id !== tx.id));
      setUndo(null);
      setError(problem);
    }
  }

  // Undo: puts the last sorted card back on top of the deck, in its
  // original place in the order, and clears its category again.
  async function undoLast() {
    if (!undo) return;
    const { tx } = undo;
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const restored = transactions.filter((t) => t.id === tx.id || !hiddenIds.includes(t.id));
    setHiddenIds((ids) => ids.filter((id) => id !== tx.id));
    setIndex(restored.findIndex((t) => t.id === tx.id));
    const problem = await assign(tx.id, null);
    if (problem) setError(problem);
  }

  // Finger down on the deck: remember where, and start the hold timer.
  // Nothing moves yet.
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (mode !== "idle" || flying || e.button !== 0 || visible.length === 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDeckWidth(e.currentTarget.offsetWidth);
    const g = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: e.timeStamp,
      lastX: e.clientX,
      lastY: e.clientY,
      timer: null as ReturnType<typeof setTimeout> | null,
      kind: "pending" as "pending" | "swipe" | "sort" | "ignore",
    };
    g.timer = setTimeout(() => {
      if (gesture.current !== g || g.kind !== "pending") return;
      g.kind = "sort";
      setFinger({ x: g.lastX, y: g.lastY });
      setMode("sorting");
      setHover(null);
    }, HOLD_MS);
    gesture.current = g;
  }

  // Finger moving: before the hold completes, a clear sideways move becomes
  // a swipe (an up/down one is ignored). While swiping, the cards follow
  // the finger; while sorting, the floating card does, and whatever cell is
  // under it lights up.
  function handlePointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.kind === "pending" && Math.hypot(dx, dy) > MOVE_TOLERANCE) {
      if (g.timer) clearTimeout(g.timer);
      g.kind = Math.abs(dx) > Math.abs(dy) ? "swipe" : "ignore";
      if (g.kind === "swipe") setMode("swiping");
    }
    if (g.kind === "swipe") {
      // Resist when there's nothing to go to in that direction.
      const blocked = (current === 0 && dx > 0) || (current === visible.length - 1 && dx < 0);
      setDragX(blocked ? dx * 0.3 : dx);
    } else if (g.kind === "sort") {
      setFinger({ x: e.clientX, y: e.clientY });
      setHover(dropAt(e.clientX, e.clientY));
    }
  }

  // Finger up: a swipe that went far or fast enough flies the top card off
  // (next) or brings the previous card back (prev), otherwise everything
  // settles back. A sort drops onto whatever is under the finger.
  function handlePointerEnd(e: React.PointerEvent) {
    const g = gesture.current;
    gesture.current = null;
    if (!g || e.pointerId !== g.id) return;
    if (g.timer) clearTimeout(g.timer);
    const released = e.type === "pointerup";

    if (g.kind === "swipe") {
      const dx = e.clientX - g.x;
      const speed = dx / Math.max(1, e.timeStamp - g.t); // px per ms
      const goNext = released && current < visible.length - 1 && (dx < -deckWidth * 0.25 || speed < -0.5);
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
    } else if (g.kind === "sort") {
      const target = released ? dropAt(e.clientX, e.clientY) : null;
      const tx = visible[current];
      if (tx && target?.startsWith("c:")) sortInto(tx, Number(target.slice(2)));
      else if (tx && target === "more") setMoreFor(tx);
      // The ✕, a gap, or an interrupted touch: the card just goes back.
    }
    setHover(null);
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

  const tx = visible[current];
  const sortingTx = mode === "sorting" ? tx : null;
  // The cards worth drawing: the previous one (waiting off to the left), the
  // top one, and three underneath.
  const drawn = visible.map((t, i) => ({ t, r: i - current })).filter(({ r }) => r >= -1 && r <= 3);

  return (
    <>
      {visible.length === 0 ? (
        emptyState
      ) : (
        <div className="flex flex-col items-center gap-2">
          {/* touch-action: none -- this area's touches are all ours, so the
              browser never scrolls the page in the middle of a sort. */}
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
              // While the grid is up, the deck fades almost away so its text
              // doesn't show through the see-through cells.
              opacity: mode === "sorting" ? 0.08 : 1,
              transition: "opacity 150ms",
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
                  <TransactionCard tx={t} lifted={sortingTx?.id === t.id} depth={depth} animate={animate} />
                </div>
              );
            })}
          </div>
          <p className="m-0 text-center text-footnote text-text-secondary">
            {current + 1} of {visible.length}
          </p>
          <p className="m-0 text-center text-footnote text-text-secondary">
            Hold a card and drag it onto a category
          </p>
          {error && <p className="m-0 text-center text-footnote text-red">{error}</p>}
        </div>
      )}

      {/* The sorting grid, over everything while a card is held: 3 rows x 2
          equal cells, with the small ✕ (cancel) in the middle. */}
      {sortingTx && (
        <Portal>
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 50,
              background: "var(--color-dim)",
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            <div
              style={{
                position: "relative",
                height: "100%",
                maxWidth: "var(--app-width)",
                margin: "0 auto",
                padding:
                  "max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
              }}
            >
              <div
                style={{
                  height: "100%",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gridTemplateRows: "1fr 1fr 1fr",
                  gap: 12,
                }}
              >
                {cells.map((cell, i) =>
                  cell ? (
                    <div
                      key={cell.key}
                      data-drop={cell.key}
                      className={`flex items-center justify-center px-3 text-center text-headline ${
                        hover === cell.key ? "text-on-accent" : "text-text"
                      }`}
                      style={{
                        borderRadius: 26,
                        background:
                          hover === cell.key
                            ? "var(--color-accent)"
                            : "color-mix(in srgb, var(--color-surface-elevated) 82%, transparent)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        transform: hover === cell.key ? "scale(1.03)" : "scale(1)",
                        transition: `background-color 120ms, color 120ms, transform 160ms ${SETTLE}`,
                      }}
                    >
                      {cell.label}
                    </div>
                  ) : (
                    <div
                      key={`empty-${i}`}
                      style={{
                        borderRadius: 26,
                        background: "color-mix(in srgb, var(--color-surface-elevated) 25%, transparent)",
                      }}
                    />
                  )
                )}
              </div>
              {/* The ✕: dead center, over the inner corners of the middle row. */}
              <div
                data-drop="cancel"
                aria-label="Cancel"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: 60,
                  height: 60,
                  marginTop: -30,
                  marginLeft: -30,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: hover === "cancel" ? "var(--color-text)" : "var(--color-surface-elevated)",
                  color: hover === "cancel" ? "var(--color-bg)" : "var(--color-text)",
                  boxShadow: "var(--card-shadow)",
                  transform: hover === "cancel" ? "scale(1.1)" : "scale(1)",
                  transition: `background-color 120ms, color 120ms, transform 160ms ${SETTLE}`,
                }}
              >
                <X size={26} strokeWidth={2.25} aria-hidden />
              </div>
            </div>
          </div>
          {/* The card, shrunk, following the finger. Over the ✕ it shrinks
              away so only the highlighted ✕ shows, and pops back up when the
              finger moves off it. (Only its size and fade animate -- its
              position always tracks the finger exactly.) */}
          <div
            aria-hidden
            style={{
              position: "fixed",
              left: finger.x - 80,
              top: finger.y - 52,
              width: 160,
              zIndex: 60,
              pointerEvents: "none",
              borderRadius: 22,
              background: "var(--color-surface-elevated)",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.3)",
              padding: "12px 14px",
              opacity: hover === "cancel" ? 0 : 1,
              transform: hover === "cancel" ? "rotate(-3deg) scale(0.5)" : "rotate(-3deg) scale(1)",
              transition: `opacity 150ms, transform 200ms ${SETTLE}`,
            }}
          >
            <div className="truncate text-subheadline text-text-secondary">{sortingTx.merchant}</div>
            <div className={`text-headline tabular-nums ${formatMoney(sortingTx.amount).isIncome ? "text-green" : ""}`}>
              {formatMoney(sortingTx.amount).text}
            </div>
          </div>
        </Portal>
      )}

      {/* "More…": the categories that didn't fit in the grid. */}
      <Sheet open={moreFor !== null} title="Sort Into" onCancel={() => setMoreFor(null)}>
        <ListSection>
          {moreCategories.map((c) => (
            <ListRow
              key={c.id}
              title={c.name}
              onClick={() => {
                const target = moreFor;
                setMoreFor(null);
                if (target) sortInto(target, c.id);
              }}
            />
          ))}
        </ListSection>
      </Sheet>

      {/* "Sorted into … · Undo", just above the tab bar. */}
      {undo && (
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
            className="flex w-full max-w-app items-center gap-3 pl-5"
            style={{
              pointerEvents: "auto",
              borderRadius: 20,
              background: "var(--color-surface-elevated)",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <span className="flex-1 truncate text-subheadline">
              Sorted into <span className="font-semibold">{undo.categoryName}</span>
            </span>
            <button type="button" onClick={undoLast} className="min-h-12 px-5 text-body font-semibold text-accent active:opacity-60">
              Undo
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// One transaction card in the deck: date and account on top, the amount
// large in the middle (money in green with "+"), the merchant under it, and
// a soft "Pending" pill if it hasn't cleared. The held card fades while its
// floating copy follows the finger. Cards further back in the deck (`depth`)
// are shaded darker -- mostly visible in Dark mode, where shadows can't show
// the depth (see --deck-shade in globals.css).
function TransactionCard({
  tx,
  lifted,
  depth,
  animate,
}: {
  tx: DeckTransaction;
  lifted: boolean;
  depth: number;
  animate: boolean;
}) {
  const amount = formatMoney(tx.amount);
  return (
    <div
      className="flex h-full flex-col items-center justify-between px-6 py-7 text-center"
      style={{
        position: "relative",
        borderRadius: CARD_RADIUS,
        background: "var(--color-surface-elevated)",
        boxShadow: "var(--card-shadow)",
        opacity: lifted ? 0.3 : 1,
        transition: "opacity 200ms",
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
