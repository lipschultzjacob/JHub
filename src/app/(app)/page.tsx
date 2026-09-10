import Link from "next/link";
import { buttonPrimary } from "@/components/recipes";

// The home page ("/") -- a simple restyled landing for now. The full
// Overview screen (today's to-dos, the sort-queue, a monthly summary) needs
// a "todos" table and category-guessing logic that don't exist yet --
// tracked separately in issue #3.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <h1 className="font-heading text-[40px]">JHub</h1>
      <Link href="/transactions" className={buttonPrimary}>
        Transactions
      </Link>
    </div>
  );
}
