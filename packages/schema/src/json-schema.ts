// Browser-safe module: no node builtins here. File emission lives in
// generate-json-schema.ts (CLI only, not exported from the package index),
// so bundlers can include the public API without externalization failures.
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  courseDocSchema,
  publishSettingsSchema,
  stateDocumentEnvelopeSchema,
} from "./schemas.js";

export type JsonSchemaDocument = Record<string, unknown>;

export type JsonSchemaFileName =
  | "course-doc.schema.json"
  | "publish-settings.schema.json"
  | "state-document-envelope.schema.json";

const applyForgeJsonSchemaMetadata = (value: unknown): void => {
  if (Array.isArray(value)) {
    for (const item of value) {
      applyForgeJsonSchemaMetadata(item);
    }
    return;
  }

  if (typeof value !== "object" || value === null) {
    return;
  }

  const record = value as Record<string, unknown>;
  if (record.description === "forge:sanitized-html-fragment") {
    record["x-forge-sanitizer"] = {
      strategy: "isSafeHtmlFragment",
      module: "@forge/schema",
    };
  }

  for (const child of Object.values(record)) {
    applyForgeJsonSchemaMetadata(child);
  }
};

const toJsonSchema = (
  title: string,
  schema: Parameters<typeof zodToJsonSchema>[0],
): JsonSchemaDocument => {
  const jsonSchema = {
    ...zodToJsonSchema(schema, {
      name: title,
      nameStrategy: "title",
    }),
    title,
  } as JsonSchemaDocument;
  applyForgeJsonSchemaMetadata(jsonSchema);
  return jsonSchema;
};

export function generateJsonSchemas(): Record<JsonSchemaFileName, JsonSchemaDocument> {
  return {
    "course-doc.schema.json": toJsonSchema("CourseDoc", courseDocSchema),
    "publish-settings.schema.json": toJsonSchema(
      "PublishSettings",
      publishSettingsSchema,
    ),
    "state-document-envelope.schema.json": toJsonSchema(
      "StateDocumentEnvelope",
      stateDocumentEnvelopeSchema,
    ),
  };
}

