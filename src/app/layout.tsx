import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { AuthSessionProvider } from "@/components/auth-session-provider";

// Barlow/Barlow Condensed are this app's design-system fonts (see
// docs/design-system.md): Barlow for body copy, Barlow Condensed for
// headings and anything numeric/large. next/font/google downloads and
// self-hosts them at build time, so the browser never makes a separate
// request to Google's servers to load them.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

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
};

// This next.js version requires theme color to live in its own `viewport`
// export rather than inside `metadata` above. It colors the browser/phone UI
// (like the status bar) that surrounds the page. #16171a is the design
// system's dark ground (docs/design-system.md) -- there's no light mode, so
// this never needs to change per theme.
export const viewport: Viewport = {
  themeColor: "#16171a",
};

// The shared page shell every single page in the app renders inside --
// fonts, the <html>/<body> tags, and the service worker registration below
// all live here once instead of being repeated on every page.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthSessionProvider>
          <ServiceWorkerRegistration />
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
