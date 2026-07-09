#!/usr/bin/env node
// U2 gate: continue-divider progressive reveal semantics of the built player
// (docs/PLAYER-UX-PLAN.md section 3). Imports @forge/player dist and asserts
// visibleBlocks + entrance resolution against the Rise-parity contract.
// Run: node e2e/player/gating-run.mjs
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const player = await import(join(root, "packages/player/dist/index.js"));

const {
  visibleBlocks,
  isContinueGate,
  computeLessonPercent,
  consumesByInteraction,
  resolveEntranceKind,
  entranceDelaySeconds,
} = player;

const failures = [];
let checks = 0;

function check(label, actual, expected) {
  checks += 1;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) failures.push(`${label}: expected ${e}, got ${a}`);
}

const settings = { paddingTop: 2, paddingBottom: 2, textColorMode: "auto" };
const paragraph = (id) => ({
  id,
  family: "text",
  variant: "paragraph",
  payload: { html: "<p>Body</p>" },
  settings,
});
const gate = (id) => ({
  id,
  family: "divider",
  variant: "continue button",
  payload: { label: "Continue" },
  settings,
});
const line = (id) => ({
  id,
  family: "divider",
  variant: "line",
  payload: { style: "solid" },
  settings,
});
const lessonOf = (blocks) => ({
  type: "blocks",
  id: "lesson-1",
  title: "Lesson",
  blocks,
});
const ids = (blocks) => blocks.map((b) => b.id);

// 1. No dividers: everything renders.
check(
  "no dividers",
  ids(visibleBlocks(lessonOf([paragraph("a"), line("d"), paragraph("b")]), new Set())),
  ["a", "d", "b"],
);

// 2. One unconsumed continue: prefix up to and including the gate.
const oneGate = lessonOf([paragraph("a"), gate("g1"), paragraph("b"), paragraph("c")]);
check("one unconsumed gate", ids(visibleBlocks(oneGate, new Set())), ["a", "g1"]);

// 3. Consumed gate + later unconsumed gate: frontier moves to gate 2.
const twoGates = lessonOf([
  paragraph("a"),
  gate("g1"),
  paragraph("b"),
  gate("g2"),
  paragraph("c"),
]);
check(
  "consumed then unconsumed gate",
  ids(visibleBlocks(twoGates, new Set(["g1"]))),
  ["a", "g1", "b", "g2"],
);

// 4. All gates consumed: full lesson (resume path renders everything).
check(
  "all gates consumed",
  ids(visibleBlocks(twoGates, new Set(["g1", "g2"]))),
  ["a", "g1", "b", "g2", "c"],
);

// 5. Divider-first edge case: only the gate mounts until it is consumed.
const gateFirst = lessonOf([gate("g1"), paragraph("a")]);
check("gate-first unconsumed", ids(visibleBlocks(gateFirst, new Set())), ["g1"]);
check("gate-first consumed", ids(visibleBlocks(gateFirst, new Set(["g1"]))), ["g1", "a"]);

// 6. Gate detection is variant-exact.
check("isContinueGate continue", isContinueGate(gate("g")), true);
check("isContinueGate line", isContinueGate(line("d")), false);

// 7. Percent math still counts hidden (gated) blocks as incomplete.
check("hidden blocks gate completion", computeLessonPercent(oneGate, new Set(["a", "g1"])), 50);
check(
  "full consumption completes",
  computeLessonPercent(oneGate, new Set(["a", "g1", "b", "c"])),
  100,
);

// 8. Timeline consumption mode (BLOCKS-POLISH-PLAN B3): interaction-gated by
// default, scroll-consumed when detailsAlwaysVisible is set or every event
// starts expanded (nothing left to open).
const timelineOf = (payload) => ({
  id: "t1",
  family: "interactive-fullscreen",
  variant: "timeline",
  payload,
  settings,
});
const tlEvent = (id, startExpanded) => ({
  id,
  title: "Event",
  html: "<p>Detail</p>",
  ...(startExpanded === undefined ? {} : { startExpanded }),
});
check(
  "timeline default is interaction-gated",
  consumesByInteraction(timelineOf({ events: [tlEvent("e1"), tlEvent("e2")] })),
  true,
);
check(
  "timeline detailsAlwaysVisible consumes by scroll",
  consumesByInteraction(
    timelineOf({ events: [tlEvent("e1")], detailsAlwaysVisible: true }),
  ),
  false,
);
check(
  "timeline all startExpanded consumes by scroll",
  consumesByInteraction(
    timelineOf({ events: [tlEvent("e1", true), tlEvent("e2", true)] }),
  ),
  false,
);
check(
  "timeline partial startExpanded stays interaction-gated",
  consumesByInteraction(
    timelineOf({ events: [tlEvent("e1", true), tlEvent("e2")] }),
  ),
  true,
);
check("continue divider still interactive", consumesByInteraction(gate("g")), true);
check("line divider still scroll-consumed", consumesByInteraction(line("d")), false);

// 9. Entrance resolution + Rise stagger timings (U1 surface used on reveal).
check("entrance inherit", resolveEntranceKind("fade", "inherit"), "fade");
check("entrance absent", resolveEntranceKind("slide", undefined), "slide");
check("entrance override", resolveEntranceKind("fade", "zoom"), "zoom");
check("entrance none wins", resolveEntranceKind("fade", "none"), "none");
check("delay idx 0", entranceDelaySeconds(0), 0.12);
check("delay idx 3", entranceDelaySeconds(3), 0.57);

if (failures.length > 0) {
  console.error(`FAIL gating-run: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`PASS gating-run: ${checks} checks (visibleBlocks + entrance resolution)`);
