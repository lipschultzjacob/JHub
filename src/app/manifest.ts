import type { MetadataRoute } from "next";

// Next.js has a built-in file convention: anything exported here is served
// automatically at /manifest.webmanifest, and Next injects the <link rel="manifest">
// tag into every page's <head> for us — no manual wiring needed.
//
// The manifest is what tells the browser "this site can be installed as an app":
// it supplies the name, icons, and how it should look/behave once installed
// (standalone window, no browser chrome, etc).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JHub",
    short_name: "JHub",
    description: "Personal productivity hub",
    start_url: "/",
    // "standalone" hides the browser's address bar/tabs so it looks like a native app.
    display: "standalone",
    background_color: "#0f172a", // shown briefly as the splash screen background on launch
    theme_color: "#0f172a", // colors the OS/browser UI (status bar, task switcher) around the app
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // "maskable" icons get cropped into different shapes (circle, squircle, etc.)
      // depending on the device, so they need extra internal padding — that's why
      // these are separate files from the "any" ones rather than reused.
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
