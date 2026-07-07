#!/usr/bin/env node
// R1 gate smoke: every block family/variant renders through the SHARED
// @forge/blocks BlockView (the same component the editor canvas and player
// mount), and the kitchen-sink fixture validates + renders end to end.
// Run: node e2e/smoke/render-smoke.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(join(root, "packages/player/package.json"));
const React = require_("react");
const { renderToStaticMarkup } = require_("react-dom/server");

const schema = await import(join(root, "packages/schema/dist/index.js"));
const blocks = await import(join(root, "packages/blocks/dist/index.js"));
const player = await import(join(root, "packages/player/dist/index.js"));

const { blockRegistry, BlockView, BlockRenderContext, defaultRenderContext } = blocks;

let rendered = 0;
const failures = [];

function renderBlock(block) {
  const el = React.createElement(
    BlockRenderContext.Provider,
    { value: defaultRenderContext },
    React.createElement(BlockView, { block }),
  );
  const html = renderToStaticMarkup(el);
  if (!html || !html.includes(`data-family="${block.family}"`)) {
    throw new Error(`empty or unmarked output for ${block.family}/${block.variant}`);
  }
  return html;
}

// 1. Registry defaults: every family x variant renders non-empty markup.
for (const [family, entry] of Object.entries(blockRegistry)) {
  for (const variant of entry.variants) {
    const payload = entry.createDefaultPayload(variant);
    entry.validatePayload(payload, variant); // throws on invalid defaults
    const block = {
      id: `smoke-${family}-${variant}`.replace(/[^a-zA-Z0-9-]/g, "-"),
      family,
      variant,
      payload,
      settings: { paddingTop: 2, paddingBottom: 2, textColorMode: "auto" },
    };
    try {
      renderBlock(block);
      rendered += 1;
    } catch (error) {
      failures.push(`${family}/${variant}: ${error.message}`);
    }
  }
}

// 2. Kitchen-sink fixture: validates against the schema and every block renders.
const fixture = JSON.parse(
  readFileSync(join(root, "packages/schema/fixtures/kitchen-sink.json"), "utf8"),
);
const course = schema.validateCourseDoc(fixture);
let fixtureBlocks = 0;
for (const lesson of course.lessons) {
  if (lesson.type !== "blocks") continue;
  for (const block of lesson.blocks) {
    try {
      renderBlock(block);
      fixtureBlocks += 1;
    } catch (error) {
      failures.push(`fixture ${block.family}/${block.variant} (${block.id}): ${error.message}`);
    }
  }
}

// 3. Module identity: the registry consumed here is the single render path.
if (typeof player.Player !== "function" || typeof player.computeLessonPercent !== "function") {
  failures.push("player public API missing Player/computeLessonPercent");
}

if (failures.length > 0) {
  console.error(`Render smoke FAILED (${failures.length}):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(
  `Render smoke passed: ${rendered} registry variants + ${fixtureBlocks} kitchen-sink blocks rendered through shared BlockView; course "${course.title}" validated.`,
);
