// Formats a transaction amount for display, e.g. "$12.34" or "+$500.00".
// Plaid's convention: a positive amount is money going OUT (a purchase), a
// negative one is money coming IN (a paycheck, a refund). Money in gets a
// "+" and is shown in green by the caller (`isIncome`).
export function formatMoney(amount: string): { text: string; isIncome: boolean } {
  const value = Number(amount);
  const isIncome = value < 0;
  const text = Math.abs(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return { text: isIncome ? `+${text}` : text, isIncome };
}

// Formats a transaction's date ("2026-09-12") like iOS lists do: "Sep 12",
// adding the year only when it isn't this year ("Dec 30, 2025").
export function formatShortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}
