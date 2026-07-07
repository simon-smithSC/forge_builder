#!/usr/bin/env node
// Contract enforcement per docs/RECOVERY-PLAN.md R0 and coordination/CONTRACTS.md.
// Run: node scripts/contract-check.mjs  (no dependencies; plain Node)
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const failures = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

// 1. The condemned parallel content model must not exist.
for (const condemned of [
  "packages/editor/src/domain/courseModel.ts",
  "packages/editor/src/domain/courseModel.test.ts",
]) {
  if (existsSync(join(root, condemned))) {
    failures.push(`${condemned} exists. The parallel content model was deleted by ADR 0003; do not resurrect it.`);
  }
}

// 2. No content-model type declarations outside packages/schema.
const contentTypeNames =
  /\b(?:interface|type)\s+(CourseDoc|CourseBlock|BlockFamily|BlockPayload|BlockSettings|MediaRef|LabelSet|QuizLesson|BlocksLesson|SectionHeader)\b/;
for (const pkg of ["editor", "player", "blocks", "ui", "xapi", "exporter"]) {
  const dir = join(root, "packages", pkg, "src");
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const src = readFileSync(file, "utf8");
    const m = src.match(contentTypeNames);
    if (m) {
      failures.push(`${relative(root, file)} declares content-model type "${m[1]}". Import it from @forge/schema instead (CONTRACTS.md).`);
    }
  }
}

// 3. No deep cross-package imports (public API from index only; styles.css exempt).
const deepImport = /from\s+["'](@forge\/[a-z-]+)\/(?!styles\.css["'])([^"']+)["']/g;
for (const pkg of ["editor", "player", "blocks", "ui", "xapi", "exporter", "schema"]) {
  const dir = join(root, "packages", pkg, "src");
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(deepImport)) {
      failures.push(`${relative(root, file)} deep-imports "${m[1]}/${m[2]}". Use the package public API.`);
    }
  }
}

// 4. Renderer single-source rule: editor and player source must not define
// per-family block renderers locally. Heuristic: files under editor/player src
// may not declare a function/component named <Family>Renderer.
const familyRenderer =
  /\b(?:function|const)\s+(Text|Impact|List|Image|Gallery|Divider|Multimedia|Interactive|Flashcard|Buttons|KnowledgeCheck|Chart|Table|Audio|Callout|Scenario|Checklist|Process|Timeline|Sorting|LabeledGraphic)Renderer\b/;
for (const pkg of ["editor", "player"]) {
  const dir = join(root, "packages", pkg, "src");
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const src = readFileSync(file, "utf8");
    const m = src.match(familyRenderer);
    if (m) {
      failures.push(`${relative(root, file)} defines ${m[0].replace(/^(function|const)\s+/, "")}. Block renderers live only in @forge/blocks.`);
    }
  }
}

// 5. localStorage course persistence is banned in the editor (ADR 0003).
// The write-ahead journal (IndexedDB) is the only allowed local persistence.
const editorDir = join(root, "packages/editor/src");
if (existsSync(editorDir)) {
  for (const file of walk(editorDir)) {
    const src = readFileSync(file, "utf8");
    if (/localStorage\.(get|set)Item\([^)]*course/i.test(src)) {
      failures.push(`${relative(root, file)} persists course data to localStorage (banned by ADR 0003).`);
    }
  }
}

if (failures.length > 0) {
  console.error("Contract check FAILED:\n");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("Contract check passed.");
