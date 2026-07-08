#!/usr/bin/env node
// Downloads the Anvil webfont binaries (not committed; the build sandbox has
// no network). Run once on a machine with network access:
//
//     node packages/ui/scripts/fetch-fonts.mjs
//
// Sources: Fontsource's variable-font mirrors of the official releases.
//   Geist Sans      (c) Vercel, SIL Open Font License 1.1
//                   https://github.com/vercel/geist-font
//   JetBrains Mono  (c) JetBrains, SIL Open Font License 1.1
//                   https://github.com/JetBrains/JetBrainsMono
// Until these exist, src/fonts.css falls back to the metric-adjusted local
// stack, so the UI stays usable (just not on-brand).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "fonts");

const FONTS = [
  {
    file: "geist-sans-variable.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/geist-sans:vf@latest/latin-wght-normal.woff2",
  },
  {
    file: "jetbrains-mono-variable.woff2",
    url: "https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono:vf@latest/latin-wght-normal.woff2",
  },
];

mkdirSync(outDir, { recursive: true });

let failed = false;
for (const { file, url } of FONTS) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 10_000) throw new Error(`suspiciously small (${buf.length} bytes)`);
    writeFileSync(join(outDir, file), buf);
    console.log(`fetched ${file} (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (error) {
    failed = true;
    console.error(`FAILED ${file} from ${url}: ${error.message}`);
  }
}

if (failed) {
  console.error("\nSome fonts failed; the fallback stack in fonts.css keeps working.");
  process.exit(1);
}
console.log(`\nFonts installed into ${outDir}. Reload the editor; Geist swaps in.`);
