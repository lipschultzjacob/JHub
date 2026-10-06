import { TabBar } from "@/components/tab-bar";

// Shared shell for every signed-in page (Overview, To Do, Settings):
// the page content plus the iPhone-style tab bar fixed to the bottom, in
// one place instead of repeated per page. Content sits in one phone-width
// column (max-w-app, 430px): JHub is designed as an iPhone app, and on a
// desktop browser it's just that column centered on the page. The safe-area
// padding (see globals.css) keeps content clear of the notch, and pb-tabbar
// leaves room at the bottom so the last row can scroll up above the tab bar.
// The "(app)" folder name is invisible in the URL -- it's a Next.js "route
// group" (see docs/ARCHITECTURE.md) -- login/signup live outside it since
// they have no tab bar.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-(--section-gap) px-safe pt-safe pb-tabbar">
        {children}
      </main>
      <TabBar />
    </>
  );
}
