// LRS transport per SPEC 6.3: batched queue with localStorage persistence,
// exponential backoff retry (capped ~30s), flush on visibility change and
// pagehide (keepalive fetch), at-least-once delivery. Statement UUIDs make
// LRS dedupe safe, so a retried batch is never a correctness problem.

import type { XapiStatement } from "./types.js";

export interface QueueStorage {
  load(): string | null;
  save(v: string): void;
}

class MemoryQueueStorage implements QueueStorage {
  private value: string | null = null;

  load(): string | null {
    return this.value;
  }

  save(v: string): void {
    this.value = v;
  }
}

const DEFAULT_STORAGE_KEY = "forge-xapi-queue";

/**
 * Default adapter: localStorage when available (browser), otherwise an
 * in-memory fallback so the package also works under plain node.
 */
export function createDefaultQueueStorage(key: string = DEFAULT_STORAGE_KEY): QueueStorage {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.getItem(key);
      return {
        load: () => {
          try {
            return localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        save: (v: string) => {
          try {
            localStorage.setItem(key, v);
          } catch {
            // Quota or privacy mode: queue continues in memory only.
          }
        },
      };
    } catch {
      // localStorage exists but is blocked; fall through to memory.
    }
  }
  return new MemoryQueueStorage();
}

export interface StatementQueueConfig {
  endpoint: string;
  auth: string;
  batchSize?: number;
  storage?: QueueStorage;
  fetchFn?: typeof fetch;
  /** Backoff tuning; defaults 1000ms base, 30000ms cap, 5 retries per flush. */
  backoffBaseMs?: number;
  backoffCapMs?: number;
  maxRetriesPerFlush?: number;
  /** Injectable sleep for tests. */
  sleepFn?: (ms: number) => Promise<void>;
}

function statementsUrl(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  return /\/statements$/i.test(trimmed) ? trimmed : `${trimmed}/statements`;
}

function parseStored(raw: string | null): XapiStatement[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as XapiStatement[]) : [];
  } catch {
    return [];
  }
}

export class StatementQueue {
  private items: XapiStatement[];
  private readonly url: string;
  private readonly auth: string;
  private readonly batchSize: number;
  private readonly storage: QueueStorage;
  private readonly fetchFn: typeof fetch;
  private readonly backoffBaseMs: number;
  private readonly backoffCapMs: number;
  private readonly maxRetriesPerFlush: number;
  private readonly sleepFn: (ms: number) => Promise<void>;
  private inflight: Promise<void> | null = null;

  constructor(config: StatementQueueConfig) {
    this.url = statementsUrl(config.endpoint);
    this.auth = config.auth;
    this.batchSize = config.batchSize ?? 25;
    this.storage = config.storage ?? createDefaultQueueStorage();
    const fetchImpl = config.fetchFn ?? (typeof fetch !== "undefined" ? fetch : undefined);
    if (!fetchImpl) {
      throw new Error("StatementQueue requires a fetch implementation.");
    }
    this.fetchFn = fetchImpl;
    this.backoffBaseMs = config.backoffBaseMs ?? 1000;
    this.backoffCapMs = config.backoffCapMs ?? 30_000;
    this.maxRetriesPerFlush = config.maxRetriesPerFlush ?? 5;
    this.sleepFn =
      config.sleepFn ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
    // Recover statements persisted by a previous session (at-least-once).
    this.items = parseStored(this.storage.load());
  }

  get pending(): number {
    return this.items.length;
  }

  /** Persists synchronously before any send attempt. */
  enqueue(statement: XapiStatement): void {
    this.items.push(statement);
    this.persist();
  }

  /**
   * Batched POST /statements. Retries with exponential backoff (capped),
   * then gives up for this flush; statements stay persisted for the next one.
   * Concurrent calls share the in-flight drain.
   */
  flush(): Promise<void> {
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = this.drain().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  /** Keepalive fetch for pagehide/visibilitychange; fire and forget. */
  flushOnHide(): void {
    if (this.items.length === 0) {
      return;
    }
    const batch = this.items.slice();
    void this.post(batch, true).then((ok) => {
      if (ok) {
        this.remove(batch);
      }
    });
  }

  private async drain(): Promise<void> {
    let retries = 0;
    while (this.items.length > 0) {
      const batch = this.items.slice(0, this.batchSize);
      const ok = await this.post(batch, false);
      if (ok) {
        this.remove(batch);
        retries = 0;
        continue;
      }
      retries += 1;
      if (retries > this.maxRetriesPerFlush) {
        return;
      }
      const delay = Math.min(
        this.backoffBaseMs * 2 ** (retries - 1),
        this.backoffCapMs,
      );
      await this.sleepFn(delay);
    }
  }

  private async post(batch: XapiStatement[], keepalive: boolean): Promise<boolean> {
    try {
      const response = await this.fetchFn(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Experience-API-Version": "1.0.3",
          ...(this.auth ? { Authorization: this.auth } : {}),
        },
        body: JSON.stringify(batch),
        ...(keepalive ? { keepalive: true } : {}),
      });
      // 409 means the LRS already has a statement with this id; with UUID
      // dedupe that is a successful at-least-once delivery, not a failure.
      return response.ok || response.status === 409;
    } catch {
      return false;
    }
  }

  private remove(batch: XapiStatement[]): void {
    const sent = new Set(batch.map((statement) => statement.id));
    this.items = this.items.filter((statement) => !sent.has(statement.id));
    this.persist();
  }

  private persist(): void {
    try {
      this.storage.save(JSON.stringify(this.items));
    } catch {
      // Storage failures must never break tracking.
    }
  }
}
