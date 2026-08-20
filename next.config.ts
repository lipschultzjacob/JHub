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
};

export default nextConfig;
