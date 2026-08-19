// One-off/rerunnable script to generate placeholder PWA icons.
// Swap the JSX below (or the whole approach) once real branding exists, then re-run:
//   node scripts/generate-icons.mjs
import { ImageResponse } from "next/og.js";
import { createElement as h } from "react";
import { writeFile, mkdir } from "node:fs/promises";

const BG = "#0f172a"; // slate-900 — neutral dark placeholder, matches theme_color
const FG = "#f8fafc"; // slate-50

async function makeIcon(size, { maskable = false } = {}) {
  // Maskable icons need safe-area padding so platform masks don't clip the glyph.
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

const jobs = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["icon-maskable-192.png", 192, { maskable: true }],
  ["icon-maskable-512.png", 512, { maskable: true }],
  ["apple-touch-icon.png", 180, {}],
];

for (const [filename, size, opts] of jobs) {
  const buf = await makeIcon(size, opts);
  await writeFile(new URL(filename, outDir), buf);
  console.log(`wrote public/icons/${filename}`);
}
