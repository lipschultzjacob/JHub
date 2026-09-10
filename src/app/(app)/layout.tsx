import { Nav } from "@/components/nav";

// Shared shell for every signed-in page (Overview, Transactions, and future
// Categories/Settings/Transaction-detail screens) -- puts the one top Nav
// bar and the page-width content wrapper (docs/design/components.md's "Page
// shell" recipe) in one place instead of repeating it per page. The
// "(app)" folder name is invisible in the URL -- it's a Next.js "route
// group" (see docs/ARCHITECTURE.md) -- login/signup live outside it since
// the design system calls for no nav bar there.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-6 px-4 py-6">
        {children}
      </main>
    </>
  );
}
