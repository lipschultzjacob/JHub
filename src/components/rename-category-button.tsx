"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryNameSheet } from "@/components/category-name-sheet";
import { primeKeyboard } from "@/components/sheet";

// The blue "Rename" button at the top-right of a category's screen. Opens
// the Rename Category sheet with the current name filled in, saves it
// (PATCH /api/categories/<id>, same name rules as creating one), then
// reloads the page's data so the new name shows.
export function RenameCategoryButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Saves the new name. Returns an error message for the sheet to show, or
  // null once it's saved.
  async function rename(newName: string) {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return (data?.error as string | undefined) ?? "Something went wrong. Try again.";
    }
    setOpen(false);
    router.refresh();
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          primeKeyboard();
          setOpen(true);
        }}
        className="-mr-2 min-h-11 px-2 text-body text-accent active:opacity-60"
      >
        Rename
      </button>
      <CategoryNameSheet
        open={open}
        title="Rename Category"
        saveLabel="Save"
        initialName={name}
        onCancel={() => setOpen(false)}
        onSubmit={rename}
      />
    </>
  );
}
