#!/usr/bin/env node
// V4 gate smoke: the course font catalog and its pure helpers behave as the
// publish pipeline and editor css generation assume. Requires the player
// dist (pnpm -F @forge/player build). Run: node e2e/smoke/fonts-smoke.mjs
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const player = await import(join(root, "packages/player/dist/index.js"));
const {
  allCourseFontFiles,
  buildFontFaceCss,
  courseFontCatalog,
  fontFilesFor,
  fontStackOf,
} = player;

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures += 1;
};

// 1. Catalog shape: the nine V4 faces exist, categorized, embeddable.
const NEW_FACES = {
  Lora: "lora",
  "Source Serif 4": "source-serif-4",
  "Libre Baskerville": "libre-baskerville",
  Spectral: "spectral",
  "Work Sans": "work-sans",
  "IBM Plex Sans": "ibm-plex-sans",
  Karla: "karla",
  "Nunito Sans": "nunito-sans",
  Manrope: "manrope",
};
for (const [name, id] of Object.entries(NEW_FACES)) {
  const face = courseFontCatalog.find((f) => f.name === name);
  check(`catalog has ${name}`, face !== undefined && face.fontsourceId === id);
}
check(
  "Source Sans Pro maps to source-sans-3",
  courseFontCatalog.find((f) => f.name === "Source Sans Pro")?.fontsourceId ===
    "source-sans-3",
);

// 2. No quote characters anywhere (V2 sanitizer contract) and every stack
// resolves through fontStackOf by name.
check(
  "no quotes in any stack",
  courseFontCatalog.every((f) => !/['"]/.test(f.stack)),
);
check(
  "fontStackOf resolves every catalog name (case-insensitive)",
  courseFontCatalog.every((f) => fontStackOf(f.name.toUpperCase()) === f.stack),
);
check(
  "no stack token starts with a digit (unquoted css ident rule)",
  courseFontCatalog.every((f) =>
    f.stack.split(",").every((token) => !/^\d/.test(token.trim())),
  ),
);
check(
  "system faces have no fontsourceId",
  courseFontCatalog
    .filter((f) => f.category === "system")
    .every((f) => f.fontsourceId === undefined),
);

// 3. fontFilesFor dedupes across heading/body/ui and skips system faces.
const dupTheme = { headingTypeface: "Lora", bodyTypeface: "lora", uiTypeface: "Georgia" };
const dupFiles = fontFilesFor(dupTheme);
check(
  "fontFilesFor dedupes heading=body and drops system faces",
  dupFiles.length === 2 &&
    dupFiles[0].file === "lora-400.woff2" &&
    dupFiles[1].file === "lora-700.woff2",
  dupFiles.map((f) => f.file).join(", "),
);
check(
  "all-system theme yields zero files",
  fontFilesFor({ headingTypeface: "Georgia", bodyTypeface: "Arial", uiTypeface: "system-ui" })
    .length === 0,
);
const mixed = fontFilesFor({
  headingTypeface: "Playfair Display",
  bodyTypeface: "Inter",
  uiTypeface: "Inter",
});
check(
  "mixed theme sorted by fontsourceId then weight",
  JSON.stringify(mixed.map((f) => f.file)) ===
    JSON.stringify([
      "inter-400.woff2",
      "inter-700.woff2",
      "playfair-display-400.woff2",
      "playfair-display-700.woff2",
    ]),
);

// 4. buildFontFaceCss: deterministic, sorted, deduped, correct url prefix.
const cssA = buildFontFaceCss([...mixed].reverse());
const cssB = buildFontFaceCss([...mixed, mixed[0]]);
check("buildFontFaceCss deterministic under reorder + dupes", cssA === cssB);
check(
  "css uses url(\"fonts/...\") + woff2 + swap",
  cssA.includes('src: url("fonts/inter-400.woff2") format("woff2");') &&
    cssA.includes("font-display: swap;"),
);
check(
  "css sorted (inter before playfair-display)",
  cssA.indexOf("inter-400") < cssA.indexOf("playfair-display-400"),
);
check(
  "css honors a custom url prefix",
  buildFontFaceCss(mixed, "/player-runtime/fonts/").includes(
    'url("/player-runtime/fonts/inter-400.woff2")',
  ),
);
check("empty file list yields empty css", buildFontFaceCss([]) === "");

// 5. Full-catalog helper covers every embeddable face x [400, 700].
const all = allCourseFontFiles();
const embeddable = courseFontCatalog.filter((f) => f.fontsourceId !== undefined);
check(
  "allCourseFontFiles = embeddable faces x 2 weights",
  all.length === embeddable.length * 2,
  `${all.length} files`,
);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
