import Link from "next/link";

// The home page ("/") -- just a title and a link into the transactions page for now.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-3xl font-semibold">JHub</h1>
      <Link
        href="/transactions"
        className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
      >
        Transactions
      </Link>
    </div>
  );
}
