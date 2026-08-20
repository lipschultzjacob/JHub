import type { MetadataRoute } from "next";

// Next.js has a built-in rule: whatever this function returns is
// automatically served at /manifest.webmanifest, and Next.js adds the right
// tag to every page's <head> to point at it -- nothing else needs to be
// wired up by hand.
//
// This "manifest" file is what tells the browser "this site can be
// installed like an app": it lists the app's name, its icons, and how it
// should look once installed (its own window, no browser address bar, etc).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JHub",
    short_name: "JHub",
    description: "Personal productivity hub",
    start_url: "/",
    display: "standalone", // hides the browser's address bar/tabs so it looks like a real app, not a website
    background_color: "#0f172a", // shown briefly as a loading-screen background right when the app opens
    theme_color: "#0f172a", // colors the surrounding phone/browser UI (like the status bar) to match the app
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
      // "maskable" icons get automatically cropped into different shapes
      // (circle, rounded square, etc.) depending on the phone, so they need
      // extra blank space around the edges to avoid getting cut off badly.
      // That's why these are separate image files rather than reusing the
      // ones above.
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
