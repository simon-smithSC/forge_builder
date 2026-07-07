import { describe, expect, it } from "vitest";
import { StatementQueue, type QueueStorage } from "./transport.js";
import type { XapiStatement } from "./types.js";

function makeStatement(id: string): XapiStatement {
  return {
    id,
    actor: { objectType: "Agent", mbox: "mailto:t@example.com" },
    verb: { id: "http://adlnet.gov/expapi/verbs/experienced", display: { "en-US": "experienced" } },
    object: { objectType: "Activity", id: "https://xapi.supercell.com/courses/c-1" },
    context: { registration: "11111111-2222-4333-8444-555555555555" },
    timestamp: "2026-07-07T00:00:00.000Z",
  };
}

class MemoryStorage implements QueueStorage {
  value: string | null = null;
  saves = 0;

  load(): string | null {
    return this.value;
  }

  save(v: string): void {
    this.saves += 1;
    this.value = v;
  }
}

interface FakeLrs {
  fetchFn: typeof fetch;
  bodies: XapiStatement[][];
  calls: number;
  failuresRemaining: number;
  status: number;
}

function fakeLrs(options: { failures?: number; status?: number } = {}): FakeLrs {
  const lrs: FakeLrs = {
    bodies: [],
    calls: 0,
    failuresRemaining: options.failures ?? 0,
    status: options.status ?? 200,
    fetchFn: (async (_url: unknown, init?: RequestInit) => {
      lrs.calls += 1;
      if (lrs.failuresRemaining > 0) {
        lrs.failuresRemaining -= 1;
        throw new TypeError("network down");
      }
      lrs.bodies.push(JSON.parse(String(init?.body)) as XapiStatement[]);
      return {
        ok: lrs.status >= 200 && lrs.status < 300,
        status: lrs.status,
      } as Response;
    }) as typeof fetch,
  };
  return lrs;
}

const instantSleep = () => Promise.resolve();

describe("StatementQueue", () => {
  it("persists synchronously on enqueue, before any send attempt", () => {
    const storage = new MemoryStorage();
    const lrs = fakeLrs();
    const queue = new StatementQueue({
      endpoint: "https://lrs.example.com/xapi",
      auth: "Basic x",
      storage,
      fetchFn: lrs.fetchFn,
    });
    queue.enqueue(makeStatement("s-1"));
    expect(lrs.calls).toBe(0);
    expect(storage.value).toContain("s-1");
    expect(queue.pending).toBe(1);
  });

  it("delivers batches to POST /statements with xAPI headers", async () => {
    const capturedInit: RequestInit[] = [];
    const urls: string[] = [];
    const fetchFn = (async (url: unknown, init?: RequestInit) => {
      urls.push(String(url));
      if (init) {
        capturedInit.push(init);
      }
      return { ok: true, status: 200 } as Response;
    }) as typeof fetch;
    const queue = new StatementQueue({
      endpoint: "https://lrs.example.com/xapi/",
      auth: "Basic abc",
      batchSize: 2,
      storage: new MemoryStorage(),
      fetchFn,
      sleepFn: instantSleep,
    });
    for (let i = 0; i < 5; i += 1) {
      queue.enqueue(makeStatement(`s-${i}`));
    }
    await queue.flush();
    expect(urls).toEqual(Array(3).fill("https://lrs.example.com/xapi/statements"));
    const sizes = capturedInit.map(
      (init) => (JSON.parse(String(init.body)) as unknown[]).length,
    );
    expect(sizes).toEqual([2, 2, 1]);
    const headers = capturedInit[0]?.headers as Record<string, string>;
    expect(headers["X-Experience-API-Version"]).toBe("1.0.3");
    expect(headers["Authorization"]).toBe("Basic abc");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(queue.pending).toBe(0);
  });

  it("retries with exponential backoff and recovers after the outage", async () => {
    const delays: number[] = [];
    const lrs = fakeLrs({ failures: 3 });
    const queue = new StatementQueue({
      endpoint: "https://lrs.example.com/xapi",
      auth: "",
      storage: new MemoryStorage(),
      fetchFn: lrs.fetchFn,
      backoffBaseMs: 1000,
      sleepFn: (ms) => {
        delays.push(ms);
        return Promise.resolve();
      },
    });
    queue.enqueue(makeStatement("s-1"));
    queue.enqueue(makeStatement("s-2"));
    await queue.flush();
    expect(delays).toEqual([1000, 2000, 4000]);
    expect(queue.pending).toBe(0);
    expect(lrs.bodies).toHaveLength(1);
    expect(lrs.bodies[0]?.map((s) => s.id)).toEqual(["s-1", "s-2"]);
  });

  it("caps the backoff delay at 30 seconds", async () => {
    const delays: number[] = [];
    const lrs = fakeLrs({ failures: 100 });
    const queue = new StatementQueue({
      endpoint: "https://lrs.example.com/xapi",
      auth: "",
      storage: new MemoryStorage(),
      fetchFn: lrs.fetchFn,
      backoffBaseMs: 16_000,
      maxRetriesPerFlush: 3,
      sleepFn: (ms) => {
        delays.push(ms);
        return Promise.resolve();
      },
    });
    queue.enqueue(makeStatement("s-1"));
    await queue.flush();
    expect(delays).toEqual([16_000, 30_000, 30_000]);
    // Gave up for this flush, but nothing is lost.
    expect(queue.pending).toBe(1);
  });

  it("keeps statements queued across instances until delivered (at-least-once)", async () => {
    const storage = new MemoryStorage();
    const offline = fakeLrs({ failures: 100 });
    const first = new StatementQueue({
      endpoint: "https://lrs.example.com/xapi",
      auth: "",
      storage,
      fetchFn: offline.fetchFn,
      maxRetriesPerFlush: 1,
      sleepFn: instantSleep,
    });
    first.enqueue(makeStatement("s-1"));
    first.enqueue(makeStatement("s-2"));
    await first.flush();
    expect(first.pending).toBe(2);

    // "Relaunch": a new queue over the same storage recovers and delivers.
    const online = fakeLrs();
    const second = new StatementQueue({
      endpoint: "https://lrs.example.com/xapi",
      auth: "",
      storage,
      fetchFn: online.fetchFn,
      sleepFn: instantSleep,
    });
    expect(second.pending).toBe(2);
    await second.flush();
    expect(second.pending).toBe(0);
    expect(online.bodies[0]?.map((s) => s.id)).toEqual(["s-1", "s-2"]);
  });

  it("treats HTTP 409 (duplicate statement id) as delivered", async () => {
    const lrs = fakeLrs({ status: 409 });
    const queue = new StatementQueue({
      endpoint: "https://lrs.example.com/xapi",
      auth: "",
      storage: new MemoryStorage(),
      fetchFn: lrs.fetchFn,
      sleepFn: instantSleep,
    });
    queue.enqueue(makeStatement("s-1"));
    await queue.flush();
    expect(queue.pending).toBe(0);
  });

  it("coalesces concurrent flush calls into one drain", async () => {
    const lrs = fakeLrs();
    const queue = new StatementQueue({
      endpoint: "https://lrs.example.com/xapi",
      auth: "",
      storage: new MemoryStorage(),
      fetchFn: lrs.fetchFn,
      sleepFn: instantSleep,
    });
    queue.enqueue(makeStatement("s-1"));
    const a = queue.flush();
    const b = queue.flush();
    expect(a).toBe(b);
    await Promise.all([a, b]);
    expect(lrs.calls).toBe(1);
  });

  it("flushOnHide sends everything pending with keepalive", async () => {
    let keepaliveSeen = false;
    const bodies: XapiStatement[][] = [];
    const fetchFn = (async (_url: unknown, init?: RequestInit) => {
      keepaliveSeen = Boolean((init as { keepalive?: boolean } | undefined)?.keepalive);
      bodies.push(JSON.parse(String(init?.body)) as XapiStatement[]);
      return { ok: true, status: 200 } as Response;
    }) as typeof fetch;
    const queue = new StatementQueue({
      endpoint: "https://lrs.example.com/xapi",
      auth: "",
      storage: new MemoryStorage(),
      fetchFn,
    });
    queue.enqueue(makeStatement("s-1"));
    queue.enqueue(makeStatement("s-2"));
    queue.flushOnHide();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(keepaliveSeen).toBe(true);
    expect(bodies[0]?.map((s) => s.id)).toEqual(["s-1", "s-2"]);
    expect(queue.pending).toBe(0);
  });
});
