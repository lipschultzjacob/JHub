"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { card, buttonGhost, buttonPrimary, buttonSecondary, inputBase, metaText45 } from "@/components/recipes";

// One category card on the Categories list. Normally shows the name (a link
// to that category's transactions), the transaction count, and Rename and
// Delete buttons. Clicking Rename swaps the name for a text box with
// Save/Cancel; clicking Delete swaps the card for a "Delete X?" confirmation
// with Delete/Cancel.
export function CategoryCard({
  id,
  name,
  total,
}: {
  id: number;
  name: string;
  total: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Which version of the card is showing: the normal view, the rename text
  // box, or the delete confirmation.
  const [mode, setMode] = useState<"view" | "rename" | "confirmDelete">("view");
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);

  // Switches into edit mode, starting from the current name.
  const startEditing = () => {
    setDraft(name);
    setError(null);
    setMode("rename");
  };

  // Switches to the delete confirmation (nothing is deleted yet).
  const startDeleting = () => {
    setError(null);
    setMode("confirmDelete");
  };

  // Goes back to the normal view without saving or deleting anything.
  const cancel = () => {
    setMode("view");
    setError(null);
  };

  // Sends the new name to the server. On success, leaves edit mode and
  // refreshes the page's data; on failure (empty, too long, duplicate...)
  // stays in edit mode and shows the server's message.
  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Try again.");
        return;
      }
      setMode("view");
      router.refresh();
    });
  };

  // Actually deletes the category (after the confirmation). On success the
  // page refresh makes this card disappear; its transactions become unsorted.
  const confirmDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Try again.");
        return;
      }
      router.refresh();
    });
  };

  if (mode === "confirmDelete") {
    return (
      <div
        className={card}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
        }}
      >
        <h4 className="truncate text-[15px]">Delete {name}?</h4>
        {total > 0 && (
          <span className={`text-[11px] ${metaText45}`}>
            {total === 1
              ? "Its 1 transaction will go back to unsorted."
              : `Its ${total} transactions will go back to unsorted.`}
          </span>
        )}
        {error && <span className="text-xs text-red-400">{error}</span>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={confirmDelete}
            disabled={isPending}
            autoFocus
            className={buttonPrimary}
          >
            {isPending ? "Deleting..." : "Delete"}
          </button>
          <button type="button" onClick={cancel} disabled={isPending} className={buttonSecondary}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (mode === "rename") {
    return (
      <form
        className={card}
        onSubmit={(e) => {
          e.preventDefault(); // Enter saves
          save();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={40}
          autoFocus
          aria-label="Category name"
          disabled={isPending}
          className={inputBase}
        />
        {error && <span className="text-xs text-red-400">{error}</span>}
        <div className="flex gap-2">
          <button type="submit" disabled={isPending} className={buttonPrimary}>
            {isPending ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={cancel} disabled={isPending} className={buttonSecondary}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={card}>
      <Link href={`/categories/${id}`} className="flex flex-col gap-2 hover:text-accent">
        <h4 className="truncate text-[15px]">{name}</h4>
        <span className={`text-[11px] ${metaText45}`}>
          {total} {total === 1 ? "transaction" : "transactions"}
        </span>
      </Link>
      <div className="flex gap-3">
        <button type="button" onClick={startEditing} className={buttonGhost}>
          Rename
        </button>
        <button type="button" onClick={startDeleting} className={buttonGhost}>
          Delete
        </button>
      </div>
    </div>
  );
}
