import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { TouchActiveStates } from "@/components/touch-active-states";

// Page-wide info like the title shown in the browser tab, and settings for
// how the app behaves when installed.
export const metadata: Metadata = {
  title: "JHub",
  description: "Personal productivity hub",
  // manifest.ts (see that file) is already auto-served at /manifest.webmanifest;
  // this just points to it explicitly to be safe.
  manifest: "/manifest.webmanifest",
  icons: {
    // iPhones/iPads ignore the icons listed in manifest.ts when you "Add to
    // Home Screen" -- they only look for this specific tag, so it has to be
    // set separately here.
    apple: "/icons/apple-touch-icon.png",
  },
  // iPhone-specific settings for when JHub is opened from the Home Screen:
  // run full-screen like an app, use "JHub" as the name under the icon, and
  // how to draw the status bar (clock/battery strip). "default" gives the
  // status bar its own solid strip above the app, so no content ever sits
  // underneath it.
  appleWebApp: {
    capable: true,
    title: "JHub",
    statusBarStyle: "default",
  },
};

// This next.js version requires these in their own `viewport` export rather
// than inside `metadata` above.
export const viewport: Viewport = {
  // "cover" lets the app draw all the way to the screen's edges, including
  // around the iPhone's notch and home indicator. The pt-safe / pb-safe /
  // px-safe helpers in globals.css then pad content back out of those areas.
  viewportFit: "cover",
  // The page supports both Light and Dark (matches globals.css), so the
  // browser can pick the right colors for its own controls before the
  // stylesheet has even loaded.
  colorScheme: "light dark",
  // Colors the browser/phone UI around the page (like the status bar) to
  // match the app's background in each mode. These have to be literal
  // values -- they can't read the CSS variables in globals.css -- so they
  // must be kept in sync with --color-bg there by hand.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// The shared page shell every single page in the app renders inside --
// the <html>/<body> tags, the service worker registration, and the iPhone
// pressed-state fix below all live here once instead of being repeated on
// every page.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthSessionProvider>
          <ServiceWorkerRegistration />
          <TouchActiveStates />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
