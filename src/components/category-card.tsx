"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { card, buttonGhost, buttonPrimary, buttonSecondary, inputBase, metaText45 } from "@/components/recipes";

// One category card on the Categories list. Normally shows the name (a link
// to that category's transactions), the transaction count, and a Rename
// button. Clicking Rename swaps the name for a text box with Save/Cancel.
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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);

  // Switches into edit mode, starting from the current name.
  const startEditing = () => {
    setDraft(name);
    setError(null);
    setEditing(true);
  };

  // Leaves edit mode without saving anything.
  const cancel = () => {
    setEditing(false);
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
      setEditing(false);
      router.refresh();
    });
  };

  if (editing) {
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
      <div>
        <button type="button" onClick={startEditing} className={buttonGhost}>
          Rename
        </button>
      </div>
    </div>
  );
}
