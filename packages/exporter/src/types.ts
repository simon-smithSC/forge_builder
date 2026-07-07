/**
 * Public contract types for @forge/exporter.
 *
 * The editor publish dialog (and later the Python publish worker) wire
 * against these exact shapes; do not rename fields without an ADR.
 */

export interface PublishWarning {
  code: string;
  message: string;
  lessonId?: string;
  blockId?: string;
}

export interface CompiledCourse {
  /** JSON string of the published course shape (stable key order). */
  courseData: string;
  warnings: PublishWarning[];
  mediaFiles: { mediaId: string; packagePath: string; storageKey: string }[];
}

export interface PackageFile {
  path: string;
  data: Uint8Array;
}
