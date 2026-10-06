"use client";

import { useRef, useState } from "react";
import { CircleCheck } from "lucide-react";
import { ListSection, rowSeparatorClass } from "@/components/grouped-list";
import { UndoBanner } from "@/components/undo-banner";
import { formatMoney, formatShortDate } from "@/lib/format-money";

export type TodoItem = {
  id: number;
  merchant: string;
  amount: string;
  date: string;
  accountName: string;
  pending: boolean;
};

// How long the "Marked as reimbursed · Undo" banner stays up.
const UNDO_MS = 5000;

// Saves whether a transaction has been reimbursed, via
// PATCH /api/transactions/<id> (the server records the time). Returns an
// error message, or null on success.
async function setReimbursed(transactionId: number, reimbursed: boolean) {
  const res = await fetch(`/api/transactions/${transactionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reimbursed }),
  });
  if (res.ok) return null;
  const data = await res.json().catch(() => null);
  return (data?.error as string | undefined) ?? "Couldn't save. Try again.";
}

// The To Do screen's list: everything marked "Reimburse" on Overview that
// you haven't been paid back for yet, one row each, with a checkmark button
// on the right. Pressing it marks the item reimbursed: the row disappears
// right away (the save runs in the background, and the row comes back with
// an error if it fails), and a "Marked as reimbursed · Undo" banner shows
// for a few seconds. `emptyState` is shown once nothing is left.
export function TodoList({ items, emptyState }: { items: TodoItem[]; emptyState: React.ReactNode }) {
  // Items checked off on this screen, hidden right away (and shown again if
  // saving fails or Undo is tapped).
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);
  const [undo, setUndo] = useState<TodoItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visible = items.filter((item) => !hiddenIds.includes(item.id));

  // Checks an item off: hides it, shows the Undo banner, and saves.
  async function markDone(item: TodoItem) {
    setError(null);
    setHiddenIds((ids) => [...ids, item.id]);
    setUndo(item);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
    const problem = await setReimbursed(item.id, true);
    if (problem) {
      setHiddenIds((ids) => ids.filter((id) => id !== item.id));
      setUndo(null);
      setError(problem);
    }
  }

  // Undo: puts the last checked-off item back on the list (in its original
  // place, since the list keeps its order) and un-marks it.
  async function undoLast() {
    if (!undo) return;
    const item = undo;
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setHiddenIds((ids) => ids.filter((id) => id !== item.id));
    const problem = await setReimbursed(item.id, false);
    if (problem) setError(problem);
  }

  return (
    <>
      {visible.length === 0 ? (
        emptyState
      ) : (
        <ListSection footer={error && <span className="text-red">{error}</span>}>
          {visible.map((item) => (
            <TodoRow key={item.id} item={item} onDone={() => markDone(item)} />
          ))}
        </ListSection>
      )}
      {undo && <UndoBanner message="Marked as reimbursed" onUndo={undoLast} />}
    </>
  );
}

// One to-do row: the merchant with "Pending · Oct 3 · Checking" under it,
// the amount (money in green with "+"), and the checkmark button on the far
// right. Only the button does anything for now -- the rest of the row is
// deliberately left untappable, saved for opening the transaction later.
function TodoRow({ item, onDone }: { item: TodoItem; onDone: () => void }) {
  const amount = formatMoney(item.amount);
  return (
    <div className={`relative flex min-h-11 items-center gap-2.5 bg-surface py-1.5 pl-gutter pr-1.5 ${rowSeparatorClass}`}>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body">{item.merchant}</span>
        <span className="truncate text-subheadline text-text-secondary">
          {item.pending && "Pending · "}
          {formatShortDate(item.date)} · {item.accountName}
        </span>
      </div>
      <span className={`shrink-0 text-body tabular-nums ${amount.isIncome ? "text-green" : ""}`}>{amount.text}</span>
      {/* 44x44 tap area (Apple's minimum) around a 26px icon. */}
      <button
        type="button"
        onClick={onDone}
        aria-label={`Mark ${item.merchant} as reimbursed`}
        className="flex size-11 shrink-0 items-center justify-center text-accent active:opacity-60"
      >
        <CircleCheck size={26} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
