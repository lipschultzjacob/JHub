// A screen's title in Apple's "Large Title" style (34px bold), shown at the
// top of each tab's scrolling content, like the big "Settings" heading in
// the iPhone Settings app. An optional `action` (e.g. a "+" button) sits at
// the far right, level with the title.
export function LargeTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2.5">
      <h1 className="m-0 min-w-0 truncate text-large-title">{children}</h1>
      {action}
    </div>
  );
}
