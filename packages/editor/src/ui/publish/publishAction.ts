// Publish pipeline: fetch the built player runtime from the editor's
// public/ dir, resolve local media blobs from the store's object URLs,
// build the xAPI package zip via @forge/exporter, and hand the bytes to
// the browser as a download.

import { buildPackage, buildZip } from "@forge/exporter";
import type { PackageFile, PublishWarning } from "@forge/exporter";
import type { CourseDoc, PublishSettings } from "@forge/schema";

export interface PublishResult {
  fileName: string;
  zipData: Uint8Array;
  zipBytes: number;
  entryCount: number;
  warnings: PublishWarning[];
  /** True when public/player-runtime/player.js|css could not be fetched. */
  playerRuntimeMissing: boolean;
}

const RUNTIME_BASE = "/player-runtime";
const LOCAL_PREFIX = "local:";

async function fetchRuntimeAsset(name: string): Promise<Uint8Array | null> {
  let response: Response;
  try {
    response = await fetch(`${RUNTIME_BASE}/${name}`, { cache: "no-store" });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  // Vite's dev-server SPA fallback answers missing files with index.html
  // (HTTP 200, text/html); treat that as "runtime not built".
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) return null;
  return new Uint8Array(await response.arrayBuffer());
}

/** <courseTitle>-xapi.zip with filesystem-hostile characters stripped. */
export function sanitizeFileName(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return `${cleaned.length > 0 ? cleaned : "course"}-xapi.zip`;
}

export async function runPublish(
  course: CourseDoc,
  settings: PublishSettings,
  mediaUrls: Readonly<Record<string, string>>,
): Promise<PublishResult> {
  const playerAssets: PackageFile[] = [];
  const js = await fetchRuntimeAsset("player.js");
  const css = await fetchRuntimeAsset("player.css");
  if (js !== null) playerAssets.push({ path: "player.js", data: js });
  if (css !== null) playerAssets.push({ path: "player.css", data: css });
  // Only the JS is load-bearing: without it the package cannot play. A
  // missing stylesheet ships unstyled but functional, so it degrades to a
  // warning inside the result panel instead of the runtime-missing alert.
  const playerRuntimeMissing = js === null;
  const playerCssMissing = js !== null && css === null;

  // "local:<mediaId>" storage keys resolve through the store's object URLs;
  // data:/url: keys never reach the resolver (exporter passthrough).
  const mediaResolver = async (storageKey: string): Promise<Uint8Array | null> => {
    if (!storageKey.startsWith(LOCAL_PREFIX)) return null;
    const objectUrl = mediaUrls[storageKey.slice(LOCAL_PREFIX.length)];
    if (objectUrl === undefined) return null;
    try {
      const response = await fetch(objectUrl);
      if (!response.ok) return null;
      return new Uint8Array(await response.arrayBuffer());
    } catch {
      return null;
    }
  };

  const { files, warnings } = await buildPackage({
    course,
    settings,
    playerAssets,
    mediaResolver,
  });
  const zipData = buildZip(files);

  const allWarnings = playerCssMissing
    ? [
        ...warnings,
        {
          code: "player_css_missing",
          message:
            "player.css was not found in the runtime bundle; the package will play unstyled. Rebuild with: pnpm --filter @forge/player build:runtime",
        },
      ]
    : warnings;

  return {
    fileName: sanitizeFileName(course.title),
    zipData,
    zipBytes: zipData.byteLength,
    entryCount: files.length,
    warnings: allWarnings,
    playerRuntimeMissing,
  };
}

/** Triggers a browser download of the built zip (Blob + anchor). */
export function downloadZip(
  result: Pick<PublishResult, "fileName" | "zipData">,
): void {
  // Copy into a fresh ArrayBuffer-backed view so Blob typing stays exact.
  const bytes = new Uint8Array(result.zipData);
  const blob = new Blob([bytes.buffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = result.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
