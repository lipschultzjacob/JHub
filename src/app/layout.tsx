import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { AuthSessionProvider } from "@/components/auth-session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
// (like the status bar) that surrounds the page.
export const viewport: Viewport = {
  themeColor: "#0f172a",
};

// The shared page shell every single page in the app renders inside --
// fonts, the <html>/<body> tags, and the service worker registration below
// all live here once instead of being repeated on every page.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
