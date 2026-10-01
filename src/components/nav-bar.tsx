import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// The top bar of a "pushed" screen -- one you go *into* from a list, like a
// bank's screen inside Settings. A tinted "‹ Settings" back link on the
// left, the screen's title in the middle, and an optional `action` on the
// right (e.g. a "Rename" button), as in iOS. (Top-level tab screens use
// LargeTitle instead.) No React hooks, so it works in Server Components.
export function NavBar({
  title,
  backHref,
  backLabel,
  action,
}: {
  title: string;
  backHref: string;
  backLabel: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-11 grid-cols-[1fr_auto_1fr] items-center gap-1.75">
      <Link
        href={backHref}
        className="-ml-1.75 flex min-h-11 items-center justify-self-start text-body text-accent no-underline active:opacity-60"
      >
        <ChevronLeft size={28} strokeWidth={2.25} aria-hidden className="-mr-0.5 shrink-0" />
        {backLabel}
      </Link>
      <h1 className="m-0 max-w-[50vw] truncate text-headline">{title}</h1>
      {action && <div className="justify-self-end">{action}</div>}
    </div>
  );
}
