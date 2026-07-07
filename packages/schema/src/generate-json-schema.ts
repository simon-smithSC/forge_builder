// CLI entry (node only): emits JSON Schema files to dist/json/. Deliberately
// NOT exported from the package index so the public API stays browser-safe.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { generateJsonSchemas } from "./json-schema.js";

export async function writeJsonSchemas(
  outputDirectory: string | URL = new URL("./json/", import.meta.url),
): Promise<void> {
  const outDir =
    typeof outputDirectory === "string"
      ? outputDirectory
      : fileURLToPath(outputDirectory);
  await mkdir(outDir, { recursive: true });

  const schemas = generateJsonSchemas();
  await Promise.all(
    Object.entries(schemas).map(([fileName, schema]) =>
      writeFile(`${outDir}/${fileName}`, `${JSON.stringify(schema, null, 2)}\n`),
    ),
  );
}

await writeJsonSchemas();
