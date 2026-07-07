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
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "../editor/public/player-runtime",
    emptyOutDir: true,
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
