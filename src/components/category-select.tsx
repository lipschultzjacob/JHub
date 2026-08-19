"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Category = { id: number; name: string };

// One dropdown per transaction row. PATCHes the category straight to the DB
// on change -- this is the same interaction the push notification's inline
// category picker will eventually reuse.
export function CategorySelect({
  transactionId,
  categoryId,
  categories,
}: {
  transactionId: number;
  categoryId: number | null;
  categories: Category[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (value: string) => {
    startTransition(async () => {
      await fetch(`/api/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: value ? Number(value) : null }),
      });
      router.refresh();
    });
  };

  return (
    <select
      value={categoryId ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isPending}
      className="rounded-md border border-white/20 bg-black px-2 py-1 text-sm disabled:opacity-50"
    >
      <option value="">Uncategorized</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
