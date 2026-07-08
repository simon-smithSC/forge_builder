import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    // This repo lives on iCloud Drive, where file mtimes can lag behind
    // writes. Vite's conditional requests (If-Modified-Since -> 304) then
    // keep validating STALE browser-cached assets: observed in the field as
    // days-old anvil.css being served despite hard refreshes. no-store makes
    // the dev server always send fresh bytes. Dev-only; production assets are
    // hashed and immutable so caching is safe there.
    headers: {
      "Cache-Control": "no-store",
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
