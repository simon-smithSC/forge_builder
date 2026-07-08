import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Standalone runtime bundle for published xAPI packages. Built on the Mac
// (not the sandbox): pnpm --filter @forge/player build:runtime
//
// Output contract (consumed by the editor publish flow, which fetches these
// from its public/ dir and hands them to @forge/exporter as lib/ assets):
//   packages/editor/public/player-runtime/player.js   (non-hashed, IIFE)
//   packages/editor/public/player-runtime/player.css  (non-hashed)
//
// The published index.html loads lib/player.js with a plain deferred script
// tag (no type="module"), so the bundle must be IIFE, not ESM.
// public/ additionally holds the course WOFF2 binaries (fonts/, filled by
// scripts/fetch-course-fonts.mjs). Vite copies publicDir into outDir for any
// build regardless of output format, so they land at player-runtime/fonts/
// with zero extra plumbing; a missing or empty public/ dir is silently fine.
export default defineConfig({
  base: "./",
  publicDir: "public",
  plugins: [react()],
  build: {
    outDir: "../editor/public/player-runtime",
    emptyOutDir: true,
    // With a raw JS entry (no HTML) + IIFE output, Vite's per-chunk CSS
    // splitting can skip emitting the entry stylesheet. Force all imported
    // CSS into a single asset so player.css reliably appears.
    cssCodeSplit: false,
    rollupOptions: {
      input: fileURLToPath(new URL("src/standalone.tsx", import.meta.url)),
      output: {
        format: "iife",
        entryFileNames: "player.js",
        assetFileNames: "player.[ext]",
      },
    },
  },
});
