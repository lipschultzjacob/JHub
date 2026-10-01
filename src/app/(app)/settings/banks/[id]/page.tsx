import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { plaidAccounts, plaidItems } from "@/db/schema";
import { auth } from "@/auth";
import { NavBar } from "@/components/nav-bar";
import { ListSection, ListRow } from "@/components/grouped-list";
import { DisconnectBankRow } from "@/components/disconnect-bank-row";
import { formatDate } from "@/lib/format-date";

// Re-run the queries on every visit instead of freezing the page at build time.
export const dynamic = "force-dynamic";

// Turns Plaid's account details into a short subtitle, e.g. "Checking ••0000".
// subtype is Plaid's specific kind ("checking"), falling back to the broad
// type ("depository"); mask is the last 4 digits of the account number.
function accountSubtitle(subtype: string | null, type: string | null, mask: string | null) {
  const kind = subtype ?? type;
  const label = kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : null;
  const digits = mask ? `••${mask}` : null;
  return [label, digits].filter(Boolean).join(" ") || undefined;
}

// One connected bank's screen ("/settings/banks/3"), opened by tapping the
// bank on Settings. A pushed screen: "‹ Settings" back button and the
// bank's name at the top. Lists the bank's accounts and when it was
// connected, and has the red "Disconnect Bank" row.
//
// `params` holds the dynamic part of the URL (the "3"). In this Next.js
// version it arrives as a Promise, so it has to be awaited.
export default async function BankPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = Number(session!.user.id);

  const { id } = await params;
  const itemId = Number(id);
  // A non-numeric URL like /settings/banks/abc becomes NaN -- treat as not found.
  if (!Number.isInteger(itemId)) notFound();

  // Never trust the URL alone: confirm this bank connection belongs to the
  // signed-in user before showing anything. Someone else's shows the same
  // "not found" page as one that doesn't exist, so its existence isn't leaked.
  const [item] = await db
    .select({
      id: plaidItems.id,
      institutionName: plaidItems.institutionName,
      createdAt: plaidItems.createdAt,
    })
    .from(plaidItems)
    .where(and(eq(plaidItems.id, itemId), eq(plaidItems.userId, userId)));
  if (!item) notFound();

  // The accounts (checking, savings, ...) under this connection. Safe to
  // query by the connection's id alone now that its ownership is confirmed.
  const accounts = await db
    .select({
      id: plaidAccounts.id,
      name: plaidAccounts.name,
      mask: plaidAccounts.mask,
      type: plaidAccounts.type,
      subtype: plaidAccounts.subtype,
    })
    .from(plaidAccounts)
    .where(eq(plaidAccounts.plaidItemId, item.id))
    .orderBy(asc(plaidAccounts.name));

  const name = item.institutionName ?? "Unnamed bank";

  return (
    <>
      <NavBar title={name} backHref="/settings" backLabel="Settings" />

      <ListSection header="Accounts" footer={`Connected ${formatDate(item.createdAt)}`}>
        {accounts.length === 0 && (
          <ListRow title={<span className="text-text-secondary">No accounts found</span>} />
        )}
        {accounts.map((account) => (
          <ListRow
            key={account.id}
            title={account.name}
            subtitle={accountSubtitle(account.subtype, account.type, account.mask)}
          />
        ))}
      </ListSection>

      <DisconnectBankRow itemId={item.id} institutionName={name} />
    </>
  );
}
