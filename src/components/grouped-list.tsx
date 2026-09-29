import Link from "next/link";
import { ChevronRight } from "lucide-react";

// The iOS "grouped inset list" -- the rounded white (or dark gray) blocks of
// rows used all over Apple's Settings app. It's this app's main container
// for content, in place of the old bordered cards. Two pieces:
//   <ListSection header="Banks" footer="...">  one rounded block of rows
//     <ListRow title="Chase" chevron href="/..." />  one row inside it
// Neither piece uses React hooks, so both work inside Server Components and
// Client Components alike. (An onClick handler, though, can only be passed
// from a Client Component.)

// One rounded block of rows, with optional small gray text above it
// (header, shown in capitals) and below it (footer, for explanations).
export function ListSection({
  header,
  footer,
  children,
}: {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col">
      {header && (
        <h2 className="m-0 px-gutter pb-1.5 text-footnote font-normal uppercase text-text-secondary">
          {header}
        </h2>
      )}
      <div className="overflow-hidden rounded-list bg-surface">{children}</div>
      {footer && <p className="m-0 px-gutter pt-1.5 text-footnote text-text-secondary">{footer}</p>}
    </section>
  );
}

type ListRowProps = {
  title: React.ReactNode;
  /** Smaller gray second line under the title. */
  subtitle?: React.ReactNode;
  /** Gray text on the right, e.g. a count or the current setting. */
  value?: React.ReactNode;
  /** Anything else on the right, e.g. a switch or a dropdown. */
  accessory?: React.ReactNode;
  /** A gray "›" on the right, meaning "tapping opens another screen". */
  chevron?: boolean;
  /** "tint" for action rows ("Connect a Bank"), "destructive" for red ones ("Sign Out"). */
  tone?: "default" | "tint" | "destructive";
  /** Makes the whole row a link to this page. */
  href?: string;
  /** Makes the whole row a button (only from a Client Component). */
  onClick?: () => void;
  disabled?: boolean;
  /** HTML id, e.g. so a link like /#transaction-5 can scroll to this row. */
  id?: string;
};

const toneClass = {
  default: "text-text",
  tint: "text-accent",
  destructive: "text-red",
};

// The thin line between rows, starting at the text's left edge as in iOS.
// Drawn as a 0.5px *border* on an "::after" overlay (a 0.5px-tall box would
// vanish -- see docs/DECISIONS.md), on every row except the section's last.
// Exported so SwipeRow can put it on its own wrapper around a row.
export const rowSeparatorClass =
  "not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-(--gutter) " +
  "not-last:after:h-0 not-last:after:border-b-[0.5px] not-last:after:border-separator";

// One row of a ListSection: at least 44px tall (Apple's minimum tap size),
// title with an optional subtitle, and optional value / accessory / chevron
// on the right. It becomes a link (href) or a button (onClick) when given
// one, and then darkens while pressed (the --row-pressed color).
export function ListRow({
  title,
  subtitle,
  value,
  accessory,
  chevron = false,
  tone = "default",
  href,
  onClick,
  disabled,
  id,
}: ListRowProps) {
  const interactive = Boolean(href || onClick) && !disabled;
  const className =
    "relative flex min-h-11 w-full items-center gap-2.5 bg-surface px-gutter py-2.5 text-left no-underline " +
    `${rowSeparatorClass} ${toneClass[tone]} ${interactive ? "active:bg-(--row-pressed)" : ""} ${disabled ? "opacity-45" : ""}`;

  const content = (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body">{title}</span>
        {subtitle && <span className="truncate text-subheadline text-text-secondary">{subtitle}</span>}
      </span>
      {value !== undefined && (
        <span className="shrink-0 text-body text-text-secondary tabular-nums">{value}</span>
      )}
      {accessory}
      {chevron && (
        <ChevronRight size={18} strokeWidth={2.25} className="-mr-1 shrink-0 text-text-secondary opacity-70" aria-hidden />
      )}
    </>
  );

  if (href && !disabled) {
    return (
      <Link id={id} href={href} className={className}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button id={id} type="button" onClick={onClick} disabled={disabled} className={className}>
        {content}
      </button>
    );
  }
  return (
    <div id={id} className={className}>
      {content}
    </div>
  );
}
