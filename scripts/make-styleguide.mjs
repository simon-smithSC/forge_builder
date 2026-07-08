#!/usr/bin/env node
// Builds anvil-styleguide.html: the self-contained living styleguide for the
// Anvil design system (@forge/ui). Same technique as make-standalone.mjs:
// every dist module of the styleguide graph becomes a data: URL entry in an
// import map; react resolves from esm.sh; anvil.css + components.css are
// inlined. Review artifact for each design-system D phase.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");

const CDN = {
  react: "https://esm.sh/react@19.2.7",
  "react/jsx-runtime": "https://esm.sh/react@19.2.7/jsx-runtime",
  "react-dom/client": "https://esm.sh/react-dom@19.2.7/client?deps=react@19.2.7",
  "react-dom": "https://esm.sh/react-dom@19.2.7?deps=react@19.2.7",
};

const modules = new Map(); // key -> js source
const importFromRe = /^((?:import|export)\b[^"'\n]*\bfrom\s*)["']([^"']+)["']/gm;
const importBareRe = /^(import\s*)["']([^"']+)["']/gm;

function keyFor(absPath) {
  return "forge/" + absPath.slice(root.length + 1).replaceAll("\\", "/");
}

function loadModule(absPath) {
  const key = keyFor(absPath);
  if (modules.has(key)) return key;
  modules.set(key, ""); // reserve against cycles
  let src = readFileSync(absPath, "utf8");
  src = src.replace(/\/\/# sourceMappingURL=.*$/gm, "");
  const rewrite = (full, head, spec) => {
    const target = resolveSpec(spec, absPath);
    return target === null ? "" : `${head}"${target}"`;
  };
  src = src.replace(importFromRe, rewrite);
  src = src.replace(importBareRe, rewrite);
  modules.set(key, src);
  return key;
}

function resolveSpec(spec, importerAbs) {
  if (CDN[spec]) return CDN[spec];
  if (spec.startsWith("./") || spec.startsWith("../")) {
    return loadModule(resolvePath(dirname(importerAbs), spec));
  }
  throw new Error(`Unresolvable specifier "${spec}" in ${importerAbs}`);
}

const entryKey = loadModule(join(root, "packages/ui/dist/styleguide/App.js"));

const importMap = { imports: { ...CDN } };
for (const [key, src] of modules.entries()) {
  importMap.imports[key] =
    "data:text/javascript;base64," + Buffer.from(src).toString("base64");
}

const css = [
  readFileSync(join(root, "packages/ui/src/anvil.css"), "utf8"),
  readFileSync(join(root, "packages/ui/src/components.css"), "utf8"),
].join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Anvil - Design System Styleguide</title>
<style>
  html, body, #root { margin: 0; min-height: 100vh; }
  #boot { font: 14px system-ui; color: #555; padding: 2rem; }
${css}
</style>
<script type="importmap">
${JSON.stringify(importMap)}
</script>
</head>
<body>
<div id="root"><div id="boot">Loading Anvil styleguide (react via esm.sh CDN)...</div></div>
<script type="module">
  Promise.all([
    import("react"),
    import("react-dom/client"),
    import(${JSON.stringify(entryKey)}),
  ])
    .then(([React, { createRoot }, { default: App }]) => {
      createRoot(document.getElementById("root")).render(React.createElement(App));
    })
    .catch((error) => {
      document.getElementById("boot").textContent = "Failed to boot: " + error.message;
      console.error(error);
    });
</script>
</body>
</html>
`;

const out = join(root, "anvil-styleguide.html");
writeFileSync(out, html);
console.log(
  `Wrote ${out}: ${modules.size} modules, ${(css.length / 1024).toFixed(1)} KB css, ${(html.length / 1024).toFixed(0)} KB total.`,
);
