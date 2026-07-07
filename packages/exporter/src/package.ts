import type { CourseDoc, PublishSettings } from "@forge/schema";
import { compileCourse } from "./compile.js";
import { buildTincanXml } from "./tincan.js";
import type { PackageFile, PublishWarning } from "./types.js";
import { escapeXml } from "./xml.js";

export interface BuildPackageInput {
  course: CourseDoc;
  settings: PublishSettings;
  /** Player bundle files (lib/player.<hash>.js etc), provided by caller. */
  playerAssets: PackageFile[];
  mediaResolver?: (storageKey: string) => Promise<Uint8Array | null>;
  iriBase?: string;
  buildId?: string;
}

export interface BuildPackageResult {
  files: PackageFile[];
  warnings: PublishWarning[];
}

const COURSE_DATA_PATH = "content/course-data.json";

function normalizeLibPath(path: string): string {
  const trimmed = path.replace(/^\.?\//, "");
  return trimmed.startsWith("lib/") ? trimmed : `lib/${trimmed}`;
}

function buildIndexHtml(input: {
  title: string;
  locale: string;
  libPaths: string[];
  buildId?: string;
}): string {
  const styles = input.libPaths.filter((path) => path.endsWith(".css"));
  const scripts = input.libPaths.filter((path) => /\.(?:js|mjs)$/.test(path));
  const launchConfig: Record<string, string> = {
    courseDataUrl: COURSE_DATA_PATH,
  };
  if (input.buildId !== undefined) {
    launchConfig["buildId"] = input.buildId;
  }
  // JSON-encode, then defuse "<" so no payload can close the script tag.
  const configJson = JSON.stringify(launchConfig).replace(/</g, "\\u003c");

  const lines: string[] = [
    "<!DOCTYPE html>",
    `<html lang="${escapeXml(input.locale)}">`,
    "  <head>",
    '    <meta charset="utf-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `    <title>${escapeXml(input.title)}</title>`,
  ];
  for (const href of styles) {
    lines.push(`    <link rel="stylesheet" href="${escapeXml(href)}" />`);
  }
  lines.push(
    "  </head>",
    "  <body>",
    '    <div id="forge-root"></div>',
    "    <script>",
    // Tincan launch parameters (endpoint, auth, actor, activity_id,
    // registration) arrive on the query string; pass location.search
    // through untouched for the player runtime to parse.
    `      window.__FORGE_LAUNCH__ = Object.assign({}, ${configJson}, {`,
    "        search: window.location.search",
    "      });",
    "    </script>",
  );
  for (const src of scripts) {
    lines.push(`    <script src="${escapeXml(src)}" defer></script>`);
  }
  lines.push("  </body>", "</html>", "");
  return lines.join("\n");
}

/**
 * Assemble the full package file list per SPEC 7: tincan.xml, index.html,
 * content/course-data.json, assets/*, lib/*. Media bytes come from the
 * caller's mediaResolver; unresolvable media produces a warning and the
 * file is skipped (data: and url: storage keys are never packaged).
 */
export async function buildPackage(input: BuildPackageInput): Promise<BuildPackageResult> {
  const compileOptions = input.iriBase !== undefined ? { iriBase: input.iriBase } : {};
  const compiled = compileCourse(input.course, input.settings, compileOptions);
  const warnings: PublishWarning[] = [...compiled.warnings];
  const encoder = new TextEncoder();

  const libFiles = input.playerAssets.map((asset) => ({
    path: normalizeLibPath(asset.path),
    data: asset.data,
  }));

  const files: PackageFile[] = [
    {
      path: "tincan.xml",
      data: encoder.encode(buildTincanXml(input.course, input.settings, compileOptions)),
    },
    {
      path: "index.html",
      data: encoder.encode(
        buildIndexHtml({
          title: input.course.title,
          locale: input.course.defaultLocale,
          libPaths: libFiles.map((file) => file.path),
          ...(input.buildId !== undefined ? { buildId: input.buildId } : {}),
        }),
      ),
    },
    { path: COURSE_DATA_PATH, data: encoder.encode(compiled.courseData) },
    ...libFiles,
  ];

  for (const mediaFile of compiled.mediaFiles) {
    const resolved =
      input.mediaResolver !== undefined
        ? await input.mediaResolver(mediaFile.storageKey)
        : null;
    if (resolved === null) {
      warnings.push({
        code: "media_unresolved",
        message: `Media "${mediaFile.mediaId}" (${mediaFile.storageKey}) could not be resolved; the package is missing ${mediaFile.packagePath}.`,
      });
      continue;
    }
    files.push({ path: mediaFile.packagePath, data: resolved });
  }

  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { files, warnings };
}
