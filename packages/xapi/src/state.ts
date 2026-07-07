// xAPI State API client per SPEC 6.4: documents keyed per (activityId, agent,
// registration), written debounced (default 5000ms) and read once at launch.
// Versioned envelope (StateDocumentEnvelope from @forge/schema) so player
// upgrades can migrate old state via the schemaVersion hook.
// Also persists a generated registration under a fixed, registration-less
// state id (SPEC 13.2 / ADR 0003) so relaunches without a launch registration
// resume the same attempt.

import type { StateDocumentEnvelope } from "@forge/schema";
import type { LaunchContext } from "./launch.js";

export const STATE_SCHEMA_VERSION = "1.0.0";
export const DEFAULT_STATE_ID = "forge-state";
export const REGISTRATION_STATE_ID = "forge-registration";

export interface StateClientConfig {
  fetchFn?: typeof fetch;
  debounceMs?: number;
  stateId?: string;
  /** Course id for the envelope; derived from the activity IRI when omitted. */
  courseId?: string;
  /**
   * Migration hook: given a stored envelope whose schemaVersion differs from
   * STATE_SCHEMA_VERSION, return the migrated envelope (or null to discard).
   */
  migrate?: (stored: unknown, schemaVersion: string) => StateDocumentEnvelope | null;
  now?: () => Date;
}

type StateBody = StateDocumentEnvelope["state"];

function deriveCourseId(activityId: string): string {
  const match = /\/courses\/([^/?#]+)/.exec(activityId);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return activityId;
}

function stateUrl(
  launch: LaunchContext,
  stateId: string,
  withRegistration: boolean,
): string {
  const base = launch.endpoint.trim().replace(/\/+$/, "");
  const params = new URLSearchParams();
  params.set("activityId", launch.activityId);
  params.set("agent", JSON.stringify(launch.actor));
  if (withRegistration) {
    params.set("registration", launch.registration);
  }
  params.set("stateId", stateId);
  return `${base}/activities/state?${params.toString()}`;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export class StateClient {
  private readonly launch: LaunchContext;
  private readonly fetchFn: typeof fetch;
  private readonly debounceMs: number;
  private readonly stateId: string;
  private readonly courseId: string;
  private readonly migrate:
    | ((stored: unknown, schemaVersion: string) => StateDocumentEnvelope | null)
    | undefined;
  private readonly now: () => Date;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pendingState: StateBody | null = null;

  constructor(launch: LaunchContext, config: StateClientConfig = {}) {
    this.launch = launch;
    const fetchImpl = config.fetchFn ?? (typeof fetch !== "undefined" ? fetch : undefined);
    if (!fetchImpl) {
      throw new Error("StateClient requires a fetch implementation.");
    }
    // Bind: calling an unbound window.fetch through `this.fetchFn(...)` sets
    // `this` to the client instance and browsers throw "Illegal invocation".
    this.fetchFn = fetchImpl.bind(globalThis) as typeof fetch;
    this.debounceMs = config.debounceMs ?? 5000;
    this.stateId = config.stateId ?? DEFAULT_STATE_ID;
    this.courseId = config.courseId ?? deriveCourseId(launch.activityId);
    this.migrate = config.migrate;
    this.now = config.now ?? (() => new Date());
  }

  private headers(json: boolean): Record<string, string> {
    return {
      "X-Experience-API-Version": "1.0.3",
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(this.launch.auth ? { Authorization: this.launch.auth } : {}),
    };
  }

  /** GET activities/state; 404 resolves to null. */
  async read(): Promise<StateDocumentEnvelope | null> {
    const response = await this.fetchFn(stateUrl(this.launch, this.stateId, true), {
      method: "GET",
      headers: this.headers(false),
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`State read failed with HTTP ${response.status}.`);
    }
    const stored: unknown = await response.json();
    if (stored === null || typeof stored !== "object") {
      return null;
    }
    const envelope = stored as StateDocumentEnvelope;
    if (envelope.schemaVersion !== STATE_SCHEMA_VERSION && this.migrate) {
      return this.migrate(stored, envelope.schemaVersion ?? "unknown");
    }
    return envelope;
  }

  /** Debounced PUT; the latest state wins when writes coalesce. */
  write(state: StateBody): void {
    this.pendingState = state;
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      const pending = this.pendingState;
      this.pendingState = null;
      if (pending) {
        void this.put(pending).catch(() => {
          // Debounced writes are best-effort; the next write retries.
        });
      }
    }, this.debounceMs);
  }

  /** Immediate PUT; cancels any pending debounced write. */
  async writeNow(state: StateBody): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingState = null;
    await this.put(state);
  }

  private buildEnvelope(state: StateBody): StateDocumentEnvelope {
    return {
      schemaVersion: STATE_SCHEMA_VERSION,
      activityId: this.launch.activityId,
      courseId: this.courseId,
      ...(isUuid(this.launch.registration)
        ? { registration: this.launch.registration }
        : {}),
      updatedAt: this.now().toISOString(),
      state,
    };
  }

  private async put(state: StateBody): Promise<void> {
    const response = await this.fetchFn(stateUrl(this.launch, this.stateId, true), {
      method: "PUT",
      headers: this.headers(true),
      body: JSON.stringify(this.buildEnvelope(state)),
    });
    if (!response.ok) {
      throw new Error(`State write failed with HTTP ${response.status}.`);
    }
  }

  /**
   * Reads the registration persisted for this (activity, agent) pair. Used
   * when the LMS launch omits registration: the first session generates one
   * (parseLaunch) and persists it here; later sessions reuse it.
   */
  async readPersistedRegistration(): Promise<string | null> {
    const response = await this.fetchFn(
      stateUrl(this.launch, REGISTRATION_STATE_ID, false),
      { method: "GET", headers: this.headers(false) },
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      return null;
    }
    const stored: unknown = await response.json();
    if (
      stored !== null &&
      typeof stored === "object" &&
      typeof (stored as { registration?: unknown }).registration === "string"
    ) {
      return (stored as { registration: string }).registration;
    }
    return null;
  }

  /** Persists the current launch registration under the fixed state id. */
  async persistRegistration(): Promise<void> {
    const response = await this.fetchFn(
      stateUrl(this.launch, REGISTRATION_STATE_ID, false),
      {
        method: "PUT",
        headers: this.headers(true),
        body: JSON.stringify({
          registration: this.launch.registration,
          updatedAt: this.now().toISOString(),
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Registration persist failed with HTTP ${response.status}.`);
    }
  }
}
