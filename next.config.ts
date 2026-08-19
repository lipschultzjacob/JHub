import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pins the workspace root to this folder. Without this, Turbopack walks
    // up looking for a lockfile and can pick up an unrelated one that happens
    // to live in a parent directory (e.g. C:\Users\user\package-lock.json).
    root: __dirname,
  },
};

export default nextConfig;
