// Generates the app's icon image files (used by the manifest and for
// Apple's home-screen icon). These are simple placeholders -- a colored
// square with a "J" on it -- meant to be swapped out once real branding/a
// real logo exists. Re-run any time with:
//   node scripts/generate-icons.mjs
import { ImageResponse } from "next/og.js";
import { createElement as h } from "react";
import { writeFile, mkdir } from "node:fs/promises";

const BG = "#0f172a"; // dark slate background, matches the app's theme color
const FG = "#f8fafc"; // near-white text color

// Draws one icon at the given size and saves it as an image, returned as
// raw file data ready to write to disk.
async function makeIcon(size, { maskable = false } = {}) {
  // "Maskable" icons get automatically cropped into different shapes
  // (circle, rounded square, etc.) depending on the phone/OS, so they need
  // extra blank space around the edges -- otherwise the "J" could get cut
  // off. That's why maskable icons use more padding than the regular ones.
  const pad = maskable ? size * 0.2 : size * 0.12;
  const inner = size - pad * 2;
  const element = h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BG,
      },
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: inner,
          height: inner,
          color: FG,
          fontSize: inner * 0.6,
          fontWeight: 700,
          fontFamily: "sans-serif",
        },
      },
      "J"
    )
  );
  const response = new ImageResponse(element, { width: size, height: size });
  return Buffer.from(await response.arrayBuffer());
}

const outDir = new URL("../public/icons/", import.meta.url);
await mkdir(outDir, { recursive: true });

// Every icon file this script needs to produce: filename, size in pixels,
// and whether it needs the extra "maskable" padding.
const jobs = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["icon-maskable-192.png", 192, { maskable: true }],
  ["icon-maskable-512.png", 512, { maskable: true }],
  ["apple-touch-icon.png", 180, {}],
];

// Generate and save every icon in the list above.
for (const [filename, size, opts] of jobs) {
  const buf = await makeIcon(size, opts);
  await writeFile(new URL(filename, outDir), buf);
  console.log(`wrote public/icons/${filename}`);
}
