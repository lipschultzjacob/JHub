// Formats a date the way iOS shows them in lists: "Sep 12, 2026". Uses UTC
// so the server (which may run in any time zone) always prints the same day
// the date was stored as.
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
