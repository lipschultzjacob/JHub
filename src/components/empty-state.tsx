import type { LucideIcon } from "lucide-react";

// What a screen shows when its list is empty, iOS style: centered in the
// space, a large gray icon, a bold title, one sentence, and optionally a
// blue button for the obvious next step (e.g. "Go to Settings"). The design
// system requires every list to have one of these instead of a blank screen.
export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-0.75 px-gutter py-16 text-center">
      <Icon size={48} strokeWidth={1.5} aria-hidden className="mb-1.75 text-text-secondary" />
      <h2 className="m-0 text-headline">{title}</h2>
      <p className="m-0 text-subheadline text-text-secondary">{message}</p>
      {action && <div className="mt-1.75">{action}</div>}
    </div>
  );
}
