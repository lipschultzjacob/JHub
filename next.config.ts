import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Turbopack is the tool that builds/serves this app during development.
    // This tells it exactly which folder is the project's root. Without it,
    // Turbopack searches upward through parent folders trying to figure that
    // out itself, and can mistakenly latch onto an unrelated project file
    // that happens to live further up (e.g. C:\Users\user\package-lock.json,
    // from an old, unrelated project on this computer).
    root: __dirname,
  },
  // Extra response headers applied to every page, mainly as protection
  // against "clickjacking" -- a trick where another site embeds this app in
  // a hidden iframe and tricks you into clicking something you didn't mean
  // to (e.g. disconnecting a bank). X-Frame-Options tells browsers to
  // refuse to embed this app in a frame at all. The other two are standard,
  // low-cost hardening: Referrer-Policy avoids leaking full page URLs (which
  // could include sensitive path info) to other sites you click through to,
  // and X-Content-Type-Options stops the browser from ever guessing a
  // file's type in a way that could turn an innocuous upload into
  // executable script.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
