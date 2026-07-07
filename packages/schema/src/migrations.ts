import {
  CURRENT_SCHEMA_VERSION,
  courseDocSchema,
  defaultCourseSettings,
  defaultLabelSet,
  defaultTheme,
  validateCourseDoc,
  type CourseDoc,
} from "./schemas.js";
import { isUlid } from "./ulid.js";

export interface CourseDocMigration {
  from: string;
  to: string;
  up(input: unknown): unknown;
}

const fallbackDate = "1970-01-01T00:00:00.000Z";

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === "object" && input !== null && !Array.isArray(input);

const stringOr = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : fallback;

const cloneJson = <T>(value: T): T => structuredClone(value);
const fallbackCourseId = "00000000000000000000000000";

const courseIdOr = (value: unknown): string =>
  typeof value === "string" && isUlid(value) ? value : fallbackCourseId;

const migrate090To100: CourseDocMigration = {
  from: "0.9.0",
  to: CURRENT_SCHEMA_VERSION,
  up(input: unknown): unknown {
    const source = isRecord(input) ? cloneJson(input) : {};

    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      id: courseIdOr(source.id),
      title: stringOr(source.title, "Untitled course"),
      description: stringOr(source.description, ""),
      defaultLocale: stringOr(source.defaultLocale, "en-US"),
      theme: isRecord(source.theme) ? source.theme : defaultTheme,
      labelSet: isRecord(source.labelSet) ? source.labelSet : defaultLabelSet,
      settings: isRecord(source.settings) ? source.settings : defaultCourseSettings,
      lessons: Array.isArray(source.lessons) ? source.lessons : [],
      media: isRecord(source.media) ? source.media : {},
      createdAt: stringOr(source.createdAt, fallbackDate),
      updatedAt: stringOr(source.updatedAt, fallbackDate),
    };
  },
};

export const courseDocMigrationRegistry = [migrate090To100] as const;

export function migrateCourseDoc(input: unknown): CourseDoc {
  const firstParse = courseDocSchema.safeParse(input);
  if (firstParse.success && firstParse.data.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return firstParse.data as CourseDoc;
  }

  let candidate = cloneJson(input);
  const seenVersions = new Set<string>();

  while (true) {
    if (!isRecord(candidate) || typeof candidate.schemaVersion !== "string") {
      throw new Error("Cannot migrate course doc without a string schemaVersion.");
    }

    const schemaVersion = candidate.schemaVersion;

    if (schemaVersion === CURRENT_SCHEMA_VERSION) {
      return validateCourseDoc(candidate);
    }

    if (seenVersions.has(schemaVersion)) {
      throw new Error(`Course doc migration loop detected at ${schemaVersion}.`);
    }
    seenVersions.add(schemaVersion);

    const migration = courseDocMigrationRegistry.find(
      (entry) => entry.from === schemaVersion,
    );
    if (!migration) {
      throw new Error(`No course doc migration registered from ${schemaVersion}.`);
    }

    candidate = migration.up(candidate);
  }
}
