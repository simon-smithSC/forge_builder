#!/usr/bin/env node
// Builds forge-review.html: a fully self-contained review build of the Forge
// editor (with live player preview) that runs from a single file in a browser.
// No bundler available in this environment (darwin-only esbuild/rollup), so
// this uses native ES modules: every workspace dist module becomes a data: URL
// entry in an import map; react/zod/yjs/lucide resolve from esm.sh; the
// services/api surface is shimmed in-page with an in-memory store seeded with
// the kitchen-sink fixture. FOR REVIEW ONLY - not a production artifact.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");

const CDN = {
  react: "https://esm.sh/react@19.2.7",
  "react/jsx-runtime": "https://esm.sh/react@19.2.7/jsx-runtime",
  "react-dom/client": "https://esm.sh/react-dom@19.2.7/client?deps=react@19.2.7",
  "react-dom": "https://esm.sh/react-dom@19.2.7?deps=react@19.2.7",
  zod: "https://esm.sh/zod@3.25.76",
  "zod-to-json-schema": "https://esm.sh/zod-to-json-schema@3.25.2?deps=zod@3.25.76",
  yjs: "https://esm.sh/yjs@13.6.31",
  "lucide-react": "https://esm.sh/lucide-react@0.561.0?deps=react@19.2.7",
  "@tiptap/core": "https://esm.sh/@tiptap/core@2.27.2",
  "@tiptap/pm": "https://esm.sh/@tiptap/pm@2.27.2",
  "@tiptap/react": "https://esm.sh/@tiptap/react@2.27.2?deps=react@19.2.7",
  "@tiptap/starter-kit": "https://esm.sh/@tiptap/starter-kit@2.27.2",
  "@dnd-kit/core": "https://esm.sh/@dnd-kit/core@6.3.1?deps=react@19.2.7",
  "@dnd-kit/sortable": "https://esm.sh/@dnd-kit/sortable@10.0.0?deps=react@19.2.7",
  "@tanstack/react-query": "https://esm.sh/@tanstack/react-query@5.101.2?deps=react@19.2.7",
  immer: "https://esm.sh/immer@10.2.0",
  zustand: "https://esm.sh/zustand@5.0.14?deps=react@19.2.7",
  "zustand/vanilla": "https://esm.sh/zustand@5.0.14/vanilla",
};

// Node builtins reachable from schema's json-schema module: functions are only
// called inside exported helpers the app never invokes, so inert stubs suffice.
const NODE_STUBS = {
  "node:fs": "export default {};",
  "node:fs/promises":
    "export const mkdir = async () => {}; export const writeFile = async () => {}; export default {};",
  "node:path": "export const join = (...p) => p.join('/'); export const dirname = (p) => p; export default {};",
  "node:url": "export const fileURLToPath = (u) => String(u); export default {};",
};

const PKG_ENTRY = {
  "@forge/schema": "packages/schema/dist/index.js",
  "@forge/blocks": "packages/blocks/dist/index.js",
  "@forge/player": "packages/player/dist/index.js",
  "@forge/xapi": "packages/xapi/dist/index.js",
  "@forge/exporter": "packages/exporter/dist/index.js",
  "@forge/ui": "packages/ui/dist/index.js",
};

const modules = new Map(); // key -> source (js)
const cssChunks = [];
// tsc emits one import/export statement per line with no quotes in the head,
// so a line-anchored regex is safe (unlike a lazy multi-line one, which can
// swallow across statements for side-effect imports).
const importFromRe = /^((?:import|export)\b[^"'\n]*\bfrom\s*)["']([^"']+)["']/gm;
const importBareRe = /^(import\s*)["']([^"']+)["']/gm;
const dynamicImportRe = /(\bimport\s*\(\s*)["']([^"']+)["']/g;

function keyFor(absPath) {
  return "forge/" + absPath.slice(root.length + 1).replaceAll("\\", "/");
}

function loadModule(absPath) {
  const key = keyFor(absPath);
  if (modules.has(key)) return key;
  modules.set(key, ""); // reserve against cycles
  let src = readFileSync(absPath, "utf8");
  // Strip sourceMappingURL comments; patch vite env access.
  src = src.replace(/\/\/# sourceMappingURL=.*$/gm, "");
  src = src.replace(/import\.meta\.env\.[A-Za-z_$][\w$]*/g, "undefined");
  const rewrite = (full, head, spec) => {
    const target = resolveSpec(spec, absPath);
    return target === null ? "" : `${head}"${target}"`;
  };
  src = src.replace(importFromRe, rewrite);
  src = src.replace(importBareRe, rewrite);
  src = src.replace(dynamicImportRe, rewrite);
  modules.set(key, src);
  return key;
}

function resolveSpec(spec, importerAbs) {
  if (spec.endsWith(".css")) {
    // Inline the stylesheet, neutralize the import.
    let cssPath;
    if (spec === "@forge/blocks/styles.css") cssPath = join(root, "packages/blocks/src/styles.css");
    else if (spec === "@forge/player/styles.css") cssPath = join(root, "packages/player/src/styles.css");
    else {
      // relative to the package's src (dist mirrors src layout)
      const distDir = dirname(importerAbs);
      const srcDir = distDir.replace("/dist", "/src");
      cssPath = resolvePath(srcDir, spec);
    }
    if (existsSync(cssPath)) cssChunks.push(readFileSync(cssPath, "utf8"));
    return "forge/empty-css";
  }
  if (CDN[spec]) return CDN[spec];
  if (NODE_STUBS[spec]) return "forge-stub/" + spec;
  if (PKG_ENTRY[spec]) return loadModule(join(root, PKG_ENTRY[spec]));
  if (spec.startsWith("./") || spec.startsWith("../")) {
    return loadModule(resolvePath(dirname(importerAbs), spec));
  }
  throw new Error(`Unresolvable specifier "${spec}" in ${importerAbs}`);
}

// Walk the graph from the editor entry.
loadModule(join(root, "packages/editor/dist/main.js"));

// Assemble the import map.
const importMap = { imports: {} };
importMap.imports["forge/empty-css"] = "data:text/javascript;base64," + Buffer.from("export {};").toString("base64");
for (const [name, body] of Object.entries(NODE_STUBS)) {
  importMap.imports["forge-stub/" + name] =
    "data:text/javascript;base64," + Buffer.from(body).toString("base64");
}
for (const [key, src] of modules.entries()) {
  importMap.imports[key] =
    "data:text/javascript;base64," + Buffer.from(src).toString("base64");
}

const kitchenSink = JSON.parse(
  readFileSync(join(root, "packages/schema/fixtures/kitchen-sink.json"), "utf8"),
);

const fetchShim = `
// In-memory services/api shim (review build only). Implements the exact
// surface of packages/editor/src/api/client.ts against a seeded store.
(() => {
  const store = new Map();
  const sessions = new Map();
  const seed = ${JSON.stringify(kitchenSink)};
  store.set(seed.id, { revision: 1, data: seed });

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const conflict = (serverRevision) =>
    json({ code: "revision_conflict", message: "Revision conflict.", details: { serverRevision } }, 409);
  const notFound = () => json({ code: "not_found", message: "Not found." }, 404);

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    if (!url.startsWith("/api/")) return realFetch(input, init);
    const path = url.slice(4);
    const method = (init.method ?? "GET").toUpperCase();
    const body = init.body ? JSON.parse(init.body) : undefined;
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent);

    if (path === "/healthz") return json({ status: "ok" });

    if (parts[0] === "courses" && parts.length === 1) {
      if (method === "GET") return json({ courses: [...store.values()] });
      if (method === "POST") {
        const row = { revision: 1, data: body.data };
        store.set(body.data.id, row);
        return json(row, 201);
      }
    }
    if (parts[0] === "courses" && parts.length === 2) {
      const row = store.get(parts[1]);
      if (!row) return notFound();
      if (method === "GET") return json(row);
      if (method === "PATCH") {
        if (body.revision !== row.revision) return conflict(row.revision);
        row.data = { ...row.data, ...body.data };
        row.revision += 1;
        return json(row);
      }
      if (method === "DELETE") { store.delete(parts[1]); return new Response(null, { status: 204 }); }
    }
    if (parts[0] === "courses" && parts[2] === "lessons" && parts.length === 4) {
      const row = store.get(parts[1]);
      if (!row) return notFound();
      if (method === "PUT") {
        if (body.revision !== row.revision) return conflict(row.revision);
        const lessons = [...row.data.lessons];
        const i = lessons.findIndex((l) => l.id === parts[3]);
        if (i === -1) lessons.push(body.data); else lessons[i] = body.data;
        row.data = { ...row.data, lessons, updatedAt: new Date().toISOString() };
        row.revision += 1;
        return json(row);
      }
      if (method === "GET") {
        const lesson = row.data.lessons.find((l) => l.id === parts[3]);
        return lesson ? json({ revision: row.revision, data: lesson }) : notFound();
      }
    }
    if (parts[0] === "courses" && parts[2] === "session") {
      const key = parts[1];
      if (method === "PUT") sessions.set(key, body.data);
      return json({ courseId: key, userSubject: "local-dev", data: sessions.get(key) ?? {}, updatedAt: new Date().toISOString() });
    }
    return notFound();
  };
})();
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Forge - R1 Review Build</title>
<style>
  html, body, #root { margin: 0; min-height: 100vh; background: #fff; }
  #boot { font: 14px system-ui; color: #555; padding: 2rem; }
${cssChunks.join("\n")}
</style>
<script type="importmap">
${JSON.stringify(importMap)}
</script>
</head>
<body>
<div id="root"><div id="boot">Loading Forge review build (react via esm.sh CDN)...</div></div>
<script>${fetchShim}</script>
<script type="module">
  import("forge/packages/editor/dist/main.js").catch((error) => {
    document.getElementById("boot").textContent = "Failed to boot: " + error.message;
    console.error(error);
  });
</script>
</body>
</html>
`;

const out = join(root, "forge-review.html");
writeFileSync(out, html);
console.log(
  `Wrote ${out}: ${modules.size} workspace modules, ${cssChunks.length} stylesheets inlined, ${(html.length / 1024).toFixed(0)} KB.`,
);
