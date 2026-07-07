// Launch parameter parsing per SPEC 6.1.
// Published packages launch via index.html?endpoint=...&auth=...&actor=...&activity_id=...&registration=...
// Missing endpoint/actor puts the player in untracked preview mode unless strict.

export interface XapiAgent {
  objectType?: "Agent";
  name?: string;
  mbox?: string;
  mbox_sha1sum?: string;
  account?: { homePage: string; name: string };
}

export interface LaunchContext {
  endpoint: string;
  auth: string;
  actor: XapiAgent;
  activityId: string;
  registration: string;
}

export type LaunchResult =
  | { mode: "tracked"; context: LaunchContext }
  | { mode: "untracked"; reason: string };

export interface ParseLaunchOptions {
  strict?: boolean;
  fallbackActivityId?: string;
  generateRegistration?: () => string;
}

export class LaunchError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(reason);
    this.name = "LaunchError";
    this.reason = reason;
  }
}

export function generateUuid(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  // Salvaged fallback from the legacy publish model launcher.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function firstString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string" && first.length > 0) {
      return first;
    }
  }
  return undefined;
}

/**
 * Normalizes an actor payload. Accepts xAPI 1.0.x Agent JSON and the legacy
 * TinCan 0.9 array form ({"name":["A"],"mbox":["mailto:a@b.c"]}) some LMS
 * launchers still emit. Throws if no inverse functional identifier is present.
 */
export function parseActor(raw: string): XapiAgent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new LaunchError("actor launch parameter is not valid JSON.");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new LaunchError("actor launch parameter must be a JSON object.");
  }
  const record = parsed as Record<string, unknown>;
  const actor: XapiAgent = { objectType: "Agent" };

  const name = firstString(record["name"]);
  if (name !== undefined) {
    actor.name = name;
  }
  const mbox = firstString(record["mbox"]);
  if (mbox !== undefined) {
    actor.mbox = mbox;
  }
  const mboxSha1 = firstString(record["mbox_sha1sum"]);
  if (mboxSha1 !== undefined) {
    actor.mbox_sha1sum = mboxSha1;
  }
  const account = record["account"];
  if (account && typeof account === "object" && !Array.isArray(account)) {
    const accountRecord = account as Record<string, unknown>;
    const homePage = firstString(accountRecord["homePage"]);
    const accountName = firstString(accountRecord["name"]);
    if (homePage !== undefined && accountName !== undefined) {
      actor.account = { homePage, name: accountName };
    }
  }

  if (!actor.mbox && !actor.mbox_sha1sum && !actor.account) {
    throw new LaunchError(
      "actor launch parameter has no identifier (mbox, mbox_sha1sum, or account).",
    );
  }
  return actor;
}

/**
 * Parses the launch query string (with or without a leading "?").
 * URLSearchParams performs the URL decoding of every parameter.
 * Missing registration is generated (ADR 0003 / SPEC 13.2); the StateClient
 * persists it under a fixed state id so relaunches reuse the same attempt.
 */
export function parseLaunch(
  search: string,
  options: ParseLaunchOptions = {},
): LaunchResult {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(query);

  const fail = (reason: string): LaunchResult => {
    if (options.strict) {
      throw new LaunchError(reason);
    }
    return { mode: "untracked", reason };
  };

  const endpoint = params.get("endpoint")?.trim();
  if (!endpoint) {
    return fail("Missing endpoint launch parameter.");
  }

  const actorRaw = params.get("actor");
  if (!actorRaw) {
    return fail("Missing actor launch parameter.");
  }

  let actor: XapiAgent;
  try {
    actor = parseActor(actorRaw);
  } catch (error) {
    return fail(
      error instanceof LaunchError
        ? error.reason
        : "actor launch parameter could not be parsed.",
    );
  }

  const activityId =
    params.get("activity_id")?.trim() ||
    params.get("activityId")?.trim() ||
    options.fallbackActivityId;
  if (!activityId) {
    return fail("Missing activity_id launch parameter and no fallback activity id.");
  }

  const registration =
    params.get("registration")?.trim() ||
    (options.generateRegistration ? options.generateRegistration() : generateUuid());

  const context: LaunchContext = {
    endpoint,
    auth: params.get("auth") ?? "",
    actor,
    activityId,
    registration,
  };
  return { mode: "tracked", context };
}
