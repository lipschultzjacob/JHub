import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { plaidItems } from "@/db/schema";
import { auth } from "@/auth";
import { LargeTitle } from "@/components/large-title";
import { ListSection, ListRow } from "@/components/grouped-list";
import { ConnectBankRow } from "@/components/connect-bank-row";
import { SyncSection } from "@/components/sync-section";
import { NotificationsSection } from "@/components/notifications-section";
import { SignOutRow } from "@/components/sign-out-row";
import { formatDate } from "@/lib/format-date";

// Re-run the query on every visit so a newly connected or disconnected bank
// shows up right away instead of a build-time snapshot.
export const dynamic = "force-dynamic";

// The Settings screen ("/settings"), as iOS-style grouped sections:
// - Connected Banks: one row per bank (tap one to open its screen, where it
//   can be disconnected), then "Connect a Bank"
// - Sync Now (only once a bank is connected)
// - Notifications: the on/off switch for this device
// - Account: your email, and Sign Out
// A "Server Component" (see ARCHITECTURE.md) that queries the database
// directly; the rows that react to taps are the browser-side parts. The
// proxy (src/proxy.ts) already guarantees you're logged in.
export default async function SettingsPage() {
  const session = await auth();
  const userId = Number(session!.user.id);

  // This user's connected banks, newest connection first.
  const items = await db
    .select({
      id: plaidItems.id,
      institutionName: plaidItems.institutionName,
      createdAt: plaidItems.createdAt,
    })
    .from(plaidItems)
    .where(eq(plaidItems.userId, userId))
    .orderBy(desc(plaidItems.createdAt));

  return (
    <>
      <LargeTitle>Settings</LargeTitle>

      <ListSection header="Connected Banks">
        {items.length === 0 && (
          <ListRow title={<span className="text-text-secondary">No banks connected yet</span>} />
        )}
        {items.map((item) => (
          <ListRow
            key={item.id}
            title={item.institutionName ?? "Unnamed bank"}
            subtitle={`Connected ${formatDate(item.createdAt)}`}
            chevron
            href={`/settings/banks/${item.id}`}
          />
        ))}
        <ConnectBankRow />
      </ListSection>

      {items.length > 0 && <SyncSection />}

      <NotificationsSection />

      <ListSection header="Account">
        <ListRow title={session!.user.email} />
        <SignOutRow />
      </ListSection>
    </>
  );
}
