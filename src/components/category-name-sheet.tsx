"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { ListSection } from "@/components/grouped-list";

// The sheet for typing a category's name, used both for creating one ("New
// Category", empty to start) and renaming one ("Rename Category", filled in
// with the current name). The save button stays grayed out until there's a
// name. `onSubmit` sends it to the server and returns an error message to
// show (e.g. "You already have a category with that name."), or null on
// success -- the parent then closes the sheet.
//
// The tap that opens it should call primeKeyboard() (see sheet.tsx) so the
// iPhone keyboard comes up straight away.
export function CategoryNameSheet({
  open,
  title,
  saveLabel,
  initialName = "",
  onCancel,
  onSubmit,
}: {
  open: boolean;
  title: string;
  saveLabel: string;
  initialName?: string;
  onCancel: () => void;
  onSubmit: (name: string) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Each time the sheet opens, start over from the given name. (Updating
  // state while rendering, based on a prop change, is React's recommended
  // way to "reset on open".)
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(initialName);
      setError(null);
    }
  }

  // Sends the name; keeps the sheet open with the error if the server
  // rejects it.
  async function save() {
    setSaving(true);
    setError(null);
    const problem = await onSubmit(draft);
    setSaving(false);
    if (problem) setError(problem);
  }

  return (
    <Sheet
      open={open}
      title={title}
      saveLabel={saveLabel}
      saveDisabled={draft.trim() === ""}
      saving={saving}
      onCancel={onCancel}
      onSave={save}
    >
      <ListSection footer={error ? <span className="text-red">{error}</span> : undefined}>
        <div className="px-gutter">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Name"
            aria-label="Category name"
            maxLength={40}
            enterKeyHint="done"
            className="min-h-11 w-full bg-transparent text-body outline-none placeholder:text-text-secondary"
          />
        </div>
      </ListSection>
    </Sheet>
  );
}
