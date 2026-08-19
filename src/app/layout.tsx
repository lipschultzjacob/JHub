import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JHub",
  description: "Personal productivity hub",
  // manifest.ts is auto-served at /manifest.webmanifest; this just points to it explicitly.
  manifest: "/manifest.webmanifest",
  icons: {
    // iOS Safari ignores the web manifest's icons for "Add to Home Screen" —
    // it only looks for this specific link tag, so it has to be set separately.
    apple: "/icons/apple-touch-icon.png",
  },
};

// themeColor/colorScheme live in a separate `viewport` export (not `metadata`)
// as of Next.js 14+ — this colors the browser UI (status bar, tab bar) around the page.
export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
