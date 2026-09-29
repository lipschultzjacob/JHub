// A screen's title in Apple's "Large Title" style (34px bold), shown at the
// top of each tab's scrolling content, like the big "Settings" heading in
// the iPhone Settings app.
export function LargeTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="m-0 text-large-title">{children}</h1>;
}
