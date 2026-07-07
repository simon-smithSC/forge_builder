// Thin typed fetch client for services/api. // R2: TanStack Query
import type { CourseDoc, Lesson } from "@forge/schema";

const API_BASE: string = import.meta.env.VITE_API_BASE ?? "/api";

// Local dev identity. services/api reads Okta-style forwarded headers
// (see services/api/src/forge_api/auth.py); in local dev the Vite proxy
// forwards these as-is. // R2: real gateway injects them, drop the defaults.
const IDENTITY_HEADERS: Record<string, string> = {
  "x-okta-subject": "local-dev",
  "x-okta-email": "dev@forge.local",
  "x-okta-name": "Local Dev",
};

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

/** 409 revision conflict, surfaced as its own type so callers can branch. */
export class ApiConflictError extends ApiRequestError {
  readonly serverRevision: number | null;

  constructor(body: ApiErrorBody) {
    super(409, body);
    this.name = "ApiConflictError";
    const details = body.details as { serverRevision?: unknown } | undefined;
    this.serverRevision =
      typeof details?.serverRevision === "number" ? details.serverRevision : null;
  }
}

/** Network-level failure (server unreachable); drives the offline state. */
export class ApiNetworkError extends Error {
  constructor(cause: unknown) {
    super("Network request failed.");
    this.name = "ApiNetworkError";
    this.cause = cause;
  }
}

export interface RevisionedCourse {
  revision: number;
  data: CourseDoc;
}

export interface SessionDoc {
  courseId: string;
  userSubject: string;
  data: Record<string, unknown>;
  updatedAt: string | null;
}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = { ...IDENTITY_HEADERS };
  const requestInit: RequestInit = {
    method: init.method ?? "GET",
    headers,
  };
  if (init.body !== undefined) {
    headers["content-type"] = "application/json";
    requestInit.body = JSON.stringify(init.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, requestInit);
  } catch (cause) {
    throw new ApiNetworkError(cause);
  }

  if (!response.ok) {
    let body: ApiErrorBody = {
      code: "unknown_error",
      message: `Request failed with status ${response.status}.`,
    };
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // Non-JSON error body; keep the fallback.
    }
    if (response.status === 409) throw new ApiConflictError(body);
    throw new ApiRequestError(response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function listCourses(): Promise<RevisionedCourse[]> {
  const body = await request<{ courses: RevisionedCourse[] }>("/courses");
  return body.courses;
}

export function createCourse(courseDoc: CourseDoc): Promise<RevisionedCourse> {
  return request<RevisionedCourse>("/courses", {
    method: "POST",
    body: { data: courseDoc },
  });
}

export function getCourse(id: string): Promise<RevisionedCourse> {
  return request<RevisionedCourse>(`/courses/${encodeURIComponent(id)}`);
}

/** PATCH merges top-level keys server-side; send only changed keys or the
 * full document. Throws ApiConflictError on revision mismatch. */
export function patchCourse(
  id: string,
  revision: number,
  data: Record<string, unknown>,
): Promise<RevisionedCourse> {
  return request<RevisionedCourse>(`/courses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { revision, data },
  });
}

export function putLesson(
  courseId: string,
  lessonId: string,
  lesson: Lesson,
  revision: number,
): Promise<RevisionedCourse> {
  return request<RevisionedCourse>(
    `/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`,
    { method: "PUT", body: { revision, data: lesson } },
  );
}

export function getSession(courseId: string): Promise<SessionDoc> {
  return request<SessionDoc>(`/courses/${encodeURIComponent(courseId)}/session`);
}

export function putSession(
  courseId: string,
  data: Record<string, unknown>,
): Promise<SessionDoc> {
  return request<SessionDoc>(`/courses/${encodeURIComponent(courseId)}/session`, {
    method: "PUT",
    body: { data },
  });
}
