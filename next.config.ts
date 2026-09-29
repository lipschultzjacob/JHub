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
  // Lets another device (your iPhone, on the same Wi-Fi) use the dev server
  // at this computer's network address, e.g. http://10.11.174.75:3000.
  // Without it, the dev server refuses to send the page's JavaScript to any
  // address other than localhost -- a dev-only safety block -- so pages load
  // but nothing on them works (forms just reload). Development only; it has
  // no effect on the production build. The address lives in .env.local
  // (DEV_ALLOWED_ORIGINS, comma-separated) rather than here, since it's
  // specific to your network and changes when that does.
  allowedDevOrigins: process.env.DEV_ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
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
