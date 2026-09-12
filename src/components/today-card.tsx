"use client";

import { useState, useTransition } from "react";
import { buttonPrimary, inputBase, card, bodyText65, metaText45 } from "@/components/recipes";

export type Todo = {
  id: number;
  text: string;
  done: boolean;
  dueDate: string | null;
};

// The "Today" card on the Overview screen: a to-do list. Unlike this repo's
// other mutating components (CategorySelect, SyncButton), which disable
// themselves and wait for the server's answer via router.refresh(), this one
// is genuinely optimistic -- the row flips (or the new item appears) the
// instant you interact, before the network request even finishes, and only
// rolls back if that request turns out to have failed. That was a deliberate
// choice made for this specific card (see issue #10) to make the to-do list
// feel instant.
export function TodayCard({ initialTodos }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState(initialTodos);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAdding, startAdding] = useTransition();

  const leftCount = todos.filter((todo) => !todo.done).length;

  // Flips one todo's done state immediately, then saves it -- putting the
  // change back the way it was (and showing a message) if the save fails.
  function toggleTodo(todo: Todo) {
    setError(null);
    const previousTodos = todos;
    setTodos((current) =>
      current.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t))
    );

    fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !todo.done }),
    }).then((res) => {
      if (!res.ok) {
        setTodos(previousTodos);
        setError("Couldn't update that -- try again.");
      }
    });
  }

  // Appends the new todo to the list right away (with a placeholder negative
  // id, since only the server knows the real one), clears the input, then
  // swaps in the real saved row once the server responds -- or removes it
  // and shows a message if saving failed.
  function addTodo(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setError(null);
    setDraft("");
    const tempId = -Date.now();
    setTodos((current) => [...current, { id: tempId, text, done: false, dueDate: null }]);

    startAdding(async () => {
      try {
        const res = await fetch("/api/todos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error("failed to add todo");
        const created = await res.json();
        setTodos((current) => current.map((t) => (t.id === tempId ? created : t)));
      } catch {
        setTodos((current) => current.filter((t) => t.id !== tempId));
        setError("Couldn't add that -- try again.");
      }
    });
  }

  return (
    <section className={card}>
      <div className="flex items-baseline justify-between">
        <h4>Today</h4>
        <span className={`text-[13px] ${metaText45}`}>{leftCount} left</span>
      </div>

      {todos.length === 0 ? (
        <p className={`text-sm ${bodyText65}`}>Nothing on your list.</p>
      ) : (
        <div className="flex flex-col">
          {todos.map((todo) => (
            <button
              key={todo.id}
              type="button"
              onClick={() => toggleTodo(todo)}
              className="flex items-start gap-3 rounded-[7px] px-1 py-2 text-left transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)]"
            >
              <span
                className={`mt-[3px] h-[17px] w-[17px] shrink-0 rounded-full border-[1.5px] ${
                  todo.done
                    ? "border-accent bg-accent"
                    : "border-[color-mix(in_srgb,var(--color-text)_35%,transparent)]"
                }`}
              />
              <span
                className={`flex-1 text-[15px] ${
                  todo.done
                    ? "text-[color-mix(in_srgb,var(--color-text)_40%,transparent)] line-through"
                    : ""
                }`}
              >
                {todo.text}
              </span>
              {todo.dueDate && (
                <span className={`mt-1 text-[11px] text-[color-mix(in_srgb,var(--color-text)_40%,transparent)]`}>
                  {todo.dueDate}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No semantic red for errors -- the design system's one-accent rule
          (see the same choice in src/app/login/page.tsx) -- so this stands
          out by being full-strength ink against the surrounding 65%/45% text,
          not by color. */}
      {error && (
        <p role="alert" className="text-[13px] text-text">
          {error}
        </p>
      )}

      <form onSubmit={addTodo} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add something"
          className={`flex-1 ${inputBase}`}
        />
        <button type="submit" disabled={isAdding} className={buttonPrimary}>
          Add
        </button>
      </form>
    </section>
  );
}
