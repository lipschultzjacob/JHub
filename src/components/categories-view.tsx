"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tags } from "lucide-react";
import { LargeTitle } from "@/components/large-title";
import { ListSection, ListRow } from "@/components/grouped-list";
import { SwipeToDelete } from "@/components/swipe-row";
import { ConfirmAlert } from "@/components/confirm-alert";
import { EmptyState } from "@/components/empty-state";
import { CategoryNameSheet } from "@/components/category-name-sheet";
import { primeKeyboard } from "@/components/sheet";

type CategoryRow = { id: number; name: string; total: number };

// Reads the error message our API sent back, or a generic one.
async function errorFrom(res: Response) {
  const data = await res.json().catch(() => null);
  return (data?.error as string | undefined) ?? "Something went wrong. Try again.";
}

// Everything on the Categories list screen that reacts to taps: the large
// title with its "+" button, one row per category (tap to open it, swipe
// left to delete it), the "are you sure?" alert, the New Category sheet,
// and the empty state when there are no categories. The page itself
// (categories/page.tsx) loads the rows from the database and passes them in.
export function CategoriesView({ rows }: { rows: CategoryRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [confirming, setConfirming] = useState<CategoryRow | null>(null);
  // Categories deleted on this screen, hidden right away instead of waiting
  // for the page to reload (and shown again if the delete fails).
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const visible = rows.filter((row) => !deletedIds.includes(row.id));

  // Opens the New Category sheet (and the keyboard with it).
  function startAdding() {
    primeKeyboard();
    setAdding(true);
  }

  // Creates the category (POST /api/categories). Returns an error message
  // for the sheet to show, or null once it's created.
  async function create(name: string) {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return errorFrom(res);
    setAdding(false);
    router.refresh();
    return null;
  }

  // Runs after "Delete" in the alert: hides the row, deletes it
  // (DELETE /api/categories/<id>), and brings it back with an error if that
  // fails. Its transactions become unsorted on the server.
  async function reallyDelete() {
    const row = confirming;
    setConfirming(null);
    if (!row) return;
    setDeleteError(null);
    setDeletedIds((ids) => [...ids, row.id]);
    const res = await fetch(`/api/categories/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeletedIds((ids) => ids.filter((id) => id !== row.id));
      setDeleteError(await errorFrom(res));
      return;
    }
    router.refresh();
  }

  return (
    <>
      <LargeTitle
        action={
          <button
            type="button"
            onClick={startAdding}
            aria-label="New Category"
            className="-mr-2.5 flex size-11 items-center justify-center text-accent active:opacity-60"
          >
            <Plus size={28} strokeWidth={2} aria-hidden />
          </button>
        }
      >
        Categories
      </LargeTitle>

      {visible.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No Categories"
          message="Create one to start sorting your transactions."
          action={
            <button type="button" onClick={startAdding} className="min-h-11 text-body text-accent active:opacity-60">
              New Category
            </button>
          }
        />
      ) : (
        <ListSection footer={deleteError ? <span className="text-red">{deleteError}</span> : undefined}>
          {visible.map((row) => (
            <SwipeToDelete key={row.id} onDelete={() => setConfirming(row)} held={confirming?.id === row.id}>
              <ListRow title={row.name} value={row.total} chevron href={`/categories/${row.id}`} />
            </SwipeToDelete>
          ))}
        </ListSection>
      )}

      <ConfirmAlert
        open={confirming !== null}
        title={`Delete ${confirming?.name ?? ""}?`}
        message={
          confirming && confirming.total > 0
            ? `Are you sure? Its ${confirming.total} ${confirming.total === 1 ? "transaction" : "transactions"} will go back to unsorted.`
            : "Are you sure?"
        }
        confirmLabel="Delete"
        onConfirm={reallyDelete}
        onCancel={() => setConfirming(null)}
      />

      <CategoryNameSheet
        open={adding}
        title="New Category"
        saveLabel="Add"
        onCancel={() => setAdding(false)}
        onSubmit={create}
      />
    </>
  );
}
