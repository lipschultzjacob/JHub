import { Nav } from "@/components/nav";

// Shared shell for every signed-in page (Overview, Categories, Settings) --
// puts the Nav bar and the content wrapper in one place instead of
// repeating them per page. Everything sits in one phone-width column
// (max-w-app, 430px): JHub is designed as an iPhone app, and on a desktop
// browser it's just that column centered on the page. The safe-area padding
// (see globals.css) keeps content clear of the notch and home indicator. The
// "(app)" folder name is invisible in the URL -- it's a Next.js "route
// group" (see docs/ARCHITECTURE.md) -- login/signup live outside it since
// the design system calls for no nav bar there.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-app flex-1 flex-col pt-[env(safe-area-inset-top)]">
      <Nav />
      <main className="flex flex-1 flex-col gap-6 px-safe pt-6 pb-safe">{children}</main>
    </div>
  );
}
