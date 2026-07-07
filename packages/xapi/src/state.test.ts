import { describe, expect, it } from "vitest";
import { stateDocumentEnvelopeSchema, type StateDocumentEnvelope } from "@forge/schema";
import type { LaunchContext } from "./launch.js";
import {
  DEFAULT_STATE_ID,
  REGISTRATION_STATE_ID,
  STATE_SCHEMA_VERSION,
  StateClient,
} from "./state.js";

const launch: LaunchContext = {
  endpoint: "https://lrs.example.com/xapi/",
  auth: "Basic abc",
  actor: { objectType: "Agent", mbox: "mailto:ada@example.com" },
  activityId: "https://xapi.supercell.com/courses/c-1",
  registration: "11111111-2222-4333-8444-555555555555",
};

const sampleState: StateDocumentEnvelope["state"] = {
  bookmark: { lessonId: "l2", scrollAnchor: "block-7" },
  progress: {
    lessons: {
      l1: {
        completed: true,
        percentComplete: 100,
        blockCount: 3,
        consumedBlockBitset: "111",
      },
      l2: {
        completed: false,
        percentComplete: 50,
        blockCount: 4,
        consumedBlockBitset: "1100",
      },
    },
  },
  quiz: {
    lq: {
      attempts: [
        {
          attempt: 1,
          score: { raw: 4, min: 0, max: 6, scaled: 0.67 },
          passed: false,
          answeredAt: "2026-07-07T10:00:00.000Z",
        },
      ],
    },
  },
  interactions: { "sc-block-1": { visitedScenes: ["scene-1"] } },
};

/** In-memory LRS state document store keyed by full request URL. */
function fakeStateLrs() {
  const documents = new Map<string, string>();
  const requests: Array<{ method: string; url: string }> = [];
  const fetchFn = (async (url: unknown, init?: RequestInit) => {
    const key = String(url);
    const method = init?.method ?? "GET";
    requests.push({ method, url: key });
    if (method === "PUT") {
      documents.set(key, String(init?.body));
      return { ok: true, status: 204 } as Response;
    }
    const stored = documents.get(key);
    if (stored === undefined) {
      return { ok: false, status: 404 } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(stored) as unknown,
    } as Response;
  }) as typeof fetch;
  return { documents, requests, fetchFn };
}

describe("StateClient", () => {
  it("round-trips an envelope through writeNow and read", async () => {
    const lrs = fakeStateLrs();
    const client = new StateClient(launch, {
      fetchFn: lrs.fetchFn,
      now: () => new Date("2026-07-07T12:00:00.000Z"),
    });
    await client.writeNow(sampleState);
    const envelope = await client.read();
    expect(envelope).not.toBeNull();
    expect(envelope?.schemaVersion).toBe(STATE_SCHEMA_VERSION);
    expect(envelope?.activityId).toBe(launch.activityId);
    expect(envelope?.courseId).toBe("c-1");
    expect(envelope?.registration).toBe(launch.registration);
    expect(envelope?.updatedAt).toBe("2026-07-07T12:00:00.000Z");
    expect(envelope?.state).toEqual(sampleState);
    // The written envelope must satisfy the schema package validator.
    expect(() => stateDocumentEnvelopeSchema.parse(envelope)).not.toThrow();
  });

  it("keys the document per activity, agent, registration and stateId", async () => {
    const lrs = fakeStateLrs();
    const client = new StateClient(launch, { fetchFn: lrs.fetchFn });
    await client.writeNow(sampleState);
    const url = lrs.requests[0]?.url ?? "";
    expect(url).toContain("/activities/state?");
    expect(url).toContain(encodeURIComponent(launch.activityId));
    expect(url).toContain(encodeURIComponent(JSON.stringify(launch.actor)));
    expect(url).toContain(launch.registration);
    expect(url).toContain(`stateId=${DEFAULT_STATE_ID}`);
  });

  it("returns null on 404", async () => {
    const lrs = fakeStateLrs();
    const client = new StateClient(launch, { fetchFn: lrs.fetchFn });
    expect(await client.read()).toBeNull();
  });

  it("debounces write and sends only the latest state", async () => {
    const lrs = fakeStateLrs();
    const client = new StateClient(launch, { fetchFn: lrs.fetchFn, debounceMs: 5 });
    client.write(sampleState);
    client.write({
      ...sampleState,
      bookmark: { lessonId: "lq" },
    });
    expect(lrs.requests.filter((r) => r.method === "PUT")).toHaveLength(0);
    await new Promise((resolve) => setTimeout(resolve, 25));
    const puts = lrs.requests.filter((r) => r.method === "PUT");
    expect(puts).toHaveLength(1);
    const envelope = await client.read();
    expect(envelope?.state.bookmark?.lessonId).toBe("lq");
  });

  it("writeNow cancels a pending debounced write", async () => {
    const lrs = fakeStateLrs();
    const client = new StateClient(launch, { fetchFn: lrs.fetchFn, debounceMs: 5 });
    client.write(sampleState);
    await client.writeNow(sampleState);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(lrs.requests.filter((r) => r.method === "PUT")).toHaveLength(1);
  });

  it("invokes the migration hook for foreign schema versions", async () => {
    const lrs = fakeStateLrs();
    const migrated: StateDocumentEnvelope = {
      schemaVersion: STATE_SCHEMA_VERSION,
      activityId: launch.activityId,
      courseId: "c-1",
      registration: launch.registration,
      updatedAt: "2026-07-07T12:00:00.000Z",
      state: sampleState,
    };
    const seen: string[] = [];
    const client = new StateClient(launch, {
      fetchFn: lrs.fetchFn,
      migrate: (_stored, version) => {
        seen.push(version);
        return migrated;
      },
    });
    // Seed a legacy document directly.
    const legacyClient = new StateClient(launch, {
      fetchFn: lrs.fetchFn,
    });
    await legacyClient.writeNow(sampleState);
    const key = [...lrs.documents.keys()][0];
    if (key) {
      const legacy = JSON.parse(lrs.documents.get(key) ?? "{}") as Record<string, unknown>;
      legacy["schemaVersion"] = "0.9.0";
      lrs.documents.set(key, JSON.stringify(legacy));
    }
    const envelope = await client.read();
    expect(seen).toEqual(["0.9.0"]);
    expect(envelope).toEqual(migrated);
  });

  it("persists and reads back a generated registration under the fixed state id", async () => {
    const lrs = fakeStateLrs();
    const client = new StateClient(launch, { fetchFn: lrs.fetchFn });
    expect(await client.readPersistedRegistration()).toBeNull();
    await client.persistRegistration();
    expect(await client.readPersistedRegistration()).toBe(launch.registration);
    // The registration document is keyed without a registration parameter so
    // a later launch (which has no registration yet) can find it.
    const registrationPut = lrs.requests.find(
      (r) => r.method === "PUT" && r.url.includes(REGISTRATION_STATE_ID),
    );
    expect(registrationPut).toBeDefined();
    expect(registrationPut?.url).not.toContain("registration=");

    // A fresh session that parsed a launch without registration resumes it.
    const nextSession = new StateClient(
      { ...launch, registration: "should-not-matter" },
      { fetchFn: lrs.fetchFn },
    );
    expect(await nextSession.readPersistedRegistration()).toBe(launch.registration);
  });
});
