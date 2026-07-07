#!/usr/bin/env node
// Runnable proof for @forge/exporter (RECOVERY-PLAN R3).
// Usage: node e2e/exporter/build-run.mjs   (from the repo root or anywhere)
//
// Builds the kitchen-sink course into a full xAPI package twice, proves
// determinism, writes /tmp/forge-package.zip, verifies it with unzip, and
// checks tincan.xml declares one cmi.interaction activity per quiz
// question and per knowledgeCheck block.

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);
const exporter = await import(new URL("packages/exporter/dist/index.js", root).href);
const schema = await import(new URL("packages/schema/dist/index.js", root).href);

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures += 1;
};

// 1. Load and validate the fixture through the real schema.
const fixturePath = fileURLToPath(
  new URL("packages/schema/fixtures/kitchen-sink.json", root),
);
const course = schema.validateCourseDoc(JSON.parse(readFileSync(fixturePath, "utf8")));
console.log(`Loaded fixture: "${course.title}" (${course.lessons.length} lessons)`);

const settings = {
  tracking: { mode: "courseCompletion", requiredLessonPercent: 100 },
  reportingMode: "completed-incomplete",
  exitCourseLink: true,
  hideCoverPage: false,
  strictLaunch: false,
  statementProfile: "forge-v1",
};

// 2. Compile determinism.
const compiledA = exporter.compileCourse(course, settings);
const compiledB = exporter.compileCourse(course, settings);
check("compileCourse deterministic", compiledA.courseData === compiledB.courseData);
console.log(
  `Compile warnings (${compiledA.warnings.length}):`,
  compiledA.warnings.map((w) => w.code).join(", ") || "none",
);
console.log(`Media files to package: ${compiledA.mediaFiles.length}`);

// 3. Full package build, twice, byte-compared.
const encoder = new TextEncoder();
const playerAssets = [
  { path: "lib/player.e2e0stub.js", data: encoder.encode("console.log('forge player stub');\n") },
  { path: "lib/player.e2e0stub.css", data: encoder.encode(":root { --forge: 1; }\n") },
];
const mediaResolver = async (storageKey) =>
  encoder.encode(`stub-bytes for ${storageKey}\n`);

async function buildOnce() {
  const pkg = await exporter.buildPackage({
    course,
    settings,
    playerAssets,
    mediaResolver,
    buildId: "e2e-proof",
  });
  return { pkg, zip: exporter.buildZip(pkg.files) };
}

const first = await buildOnce();
const second = await buildOnce();
check(
  "buildPackage + buildZip deterministic",
  Buffer.from(first.zip).equals(Buffer.from(second.zip)),
  `${first.zip.length} bytes`,
);
console.log(
  `Package warnings (${first.pkg.warnings.length}):`,
  first.pkg.warnings.map((w) => w.code).join(", ") || "none",
);

// 4. Layout assertions.
const paths = first.pkg.files.map((f) => f.path);
check("layout: tincan.xml", paths.includes("tincan.xml"));
check("layout: index.html", paths.includes("index.html"));
check("layout: content/course-data.json", paths.includes("content/course-data.json"));
check("layout: assets/*", paths.some((p) => p.startsWith("assets/")));
check("layout: lib/*", paths.some((p) => p.startsWith("lib/")));

const zipPath = "/tmp/forge-package.zip";
writeFileSync(zipPath, first.zip);
console.log(`Wrote ${zipPath} (${first.zip.length} bytes, ${paths.length} entries)`);

// 5. Prove the zip is well-formed with an independent tool.
try {
  const listing = execFileSync("unzip", ["-l", zipPath], { encoding: "utf8" });
  console.log("\n$ unzip -l /tmp/forge-package.zip");
  console.log(listing);
  check("unzip -l lists all entries", listing.includes("tincan.xml"));
  const test = execFileSync("unzip", ["-t", zipPath], { encoding: "utf8" });
  console.log("$ unzip -t /tmp/forge-package.zip");
  console.log(test.trim().split("\n").slice(-2).join("\n"));
  check("unzip -t reports no errors", test.includes("No errors detected"));
} catch (error) {
  check("unzip verification", false, String(error.message ?? error));
}

// 6. tincan.xml interaction coverage: one cmi.interaction per quiz
// question and per knowledgeCheck block.
const tincan = new TextDecoder().decode(
  first.pkg.files.find((f) => f.path === "tincan.xml").data,
);
const expectedInteractionIds = [];
for (const lesson of course.lessons) {
  if (lesson.type === "quiz") {
    for (const question of lesson.questions) expectedInteractionIds.push(question.id);
  } else if (lesson.type === "blocks") {
    for (const block of lesson.blocks) {
      if (block.family === "knowledgeCheck") expectedInteractionIds.push(block.id);
    }
  }
}
const declared = tincan.match(
  /type="http:\/\/adlnet\.gov\/expapi\/activities\/cmi\.interaction"/g,
);
const declaredCount = declared ? declared.length : 0;
console.log(
  `\ncmi.interaction activities: expected ${expectedInteractionIds.length} ` +
    `(quiz questions + knowledgeCheck blocks), tincan.xml declares ${declaredCount}`,
);
check(
  "one cmi.interaction per quiz question + knowledgeCheck block",
  declaredCount === expectedInteractionIds.length,
);
for (const id of expectedInteractionIds) {
  const iri = schema.buildInteractionIri(course.id, id);
  check(`  interaction activity ${id}`, tincan.includes(`id="${iri}"`));
}
const moduleCount = (tincan.match(/type="http:\/\/adlnet\.gov\/expapi\/activities\/module"/g) || []).length;
const nonSectionLessons = course.lessons.filter((l) => l.type !== "section").length;
check("one module activity per non-section lesson", moduleCount === nonSectionLessons, `${moduleCount}/${nonSectionLessons}`);

// 7. Show the generated tincan.xml head.
console.log("\nFirst 30 lines of tincan.xml:");
console.log(tincan.split("\n").slice(0, 30).join("\n"));

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
