import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { plaidItems } from "@/db/schema";
import { auth } from "@/auth";
import { PlaidLinkButton } from "@/components/plaid-link-button";
import { SyncButton } from "@/components/sync-button";
import { DisconnectBankButton } from "@/components/disconnect-bank-button";
import { SignOutButton } from "@/components/sign-out-button";
import { card, bodyText65, metaText45 } from "@/components/recipes";

// Re-run the query on every visit so a newly connected or disconnected bank
// shows up right away instead of a build-time snapshot.
export const dynamic = "force-dynamic";

// The Settings screen ("/settings"): manage connected banks (connect,
// sync, disconnect) and sign out. A "Server Component" (see ARCHITECTURE.md)
// that queries the database directly; the buttons are the browser-side parts.
// The proxy (src/proxy.ts) already guarantees you're logged in.
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
      <h1 className="font-heading text-[40px]">Settings</h1>

      <section className={card}>
        <h4>Connected banks</h4>

        {items.length === 0 && (
          <p className={`text-sm ${bodyText65}`}>
            No bank connected yet. Connect one to start pulling in transactions.
          </p>
        )}

        <div className="flex flex-col">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[color-mix(in_srgb,var(--color-text)_8%,transparent)] py-[var(--row-pad)]"
            >
              <div className="min-w-[160px] flex-1">
                <div className="truncate text-[15px]">
                  {item.institutionName ?? "Unnamed bank"}
                </div>
                <div className={`text-[11px] ${metaText45}`}>
                  Connected {item.createdAt.toISOString().slice(0, 10)}
                </div>
              </div>
              <DisconnectBankButton
                itemId={item.id}
                institutionName={item.institutionName ?? "this bank"}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PlaidLinkButton />
          {items.length > 0 && <SyncButton />}
        </div>
      </section>

      <section className={card}>
        <h4>Account</h4>
        <div className="flex flex-wrap items-center gap-3">
          <SignOutButton />
        </div>
      </section>
    </>
  );
}
