"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { inputBase } from "@/components/recipes";

type Category = { id: number; name: string };

// The category dropdown shown next to each transaction. Saves your choice
// straight to the database as soon as you change it -- this is the same
// action the push notification's built-in category picker will eventually
// reuse. `className` replaces the default boxed look (e.g. the plain blue
// text used inside iOS-style list rows).
export function CategorySelect({
  transactionId,
  categoryId,
  categories,
  className = inputBase,
}: {
  transactionId: number;
  categoryId: number | null;
  categories: Category[];
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Runs when a new category is picked -- saves it, then refreshes the page's data.
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
      aria-label="Category"
      className={`${className} disabled:opacity-45`}
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
