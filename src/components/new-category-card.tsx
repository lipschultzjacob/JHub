"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { card, buttonGhost, buttonPrimary, buttonSecondary, inputBase } from "@/components/recipes";

// The first card on the Categories list, used to create a new category.
// Normally just a "+ New category" button; clicking it swaps in a text box
// with Save/Cancel (the same interaction as renaming a category). Saving
// calls POST /api/categories.
export function NewCategoryCard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Opens the text box, starting empty.
  const start = () => {
    setDraft("");
    setError(null);
    setOpen(true);
  };

  // Closes the text box without creating anything.
  const cancel = () => {
    setOpen(false);
    setError(null);
  };

  // Sends the name to the server. On success, closes the text box and
  // refreshes the page's data so the new category's card appears; on failure
  // (empty, too long, duplicate...) stays open and shows the server's message.
  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Try again.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <div className={card}>
        <div>
          <button type="button" onClick={start} className={buttonGhost}>
            + New category
          </button>
        </div>
      </div>
    );
  }

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
        placeholder="Category name"
        aria-label="New category name"
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
