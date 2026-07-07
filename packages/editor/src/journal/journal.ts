// IndexedDB write-ahead journal per SPEC 4.5.2. Entries are appended BEFORE
// each save attempt and pruned on server acknowledgement. If the browser
// crashes mid-save, unacked entries newer than the server revision drive the
// "Restore unsaved changes from this device" prompt on next load.
import type { Lesson } from "@forge/schema";

export interface JournalEntry {
  courseId: string;
  lessonId: string;
  lesson: Lesson;
  baseRevision: number;
  at: string;
}

interface StoredEntry extends JournalEntry {
  key?: number;
}

const DB_NAME = "forge-editor-journal";
const DB_VERSION = 1;
const STORE = "entries";
const MAX_BYTES_PER_COURSE = 5 * 1024 * 1024;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "key",
          autoIncrement: true,
        });
        store.createIndex("byCourse", "courseId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return dbPromise;
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB error"));
  });
}

async function entriesForCourse(courseId: string): Promise<StoredEntry[]> {
  const db = await openDb();
  if (!db) return [];
  const tx = db.transaction(STORE, "readonly");
  const index = tx.objectStore(STORE).index("byCourse");
  const entries = await promisify(
    index.getAll(courseId) as IDBRequest<StoredEntry[]>,
  );
  entries.sort((a, b) => a.at.localeCompare(b.at) || (a.key ?? 0) - (b.key ?? 0));
  return entries;
}

function entrySize(entry: StoredEntry): number {
  try {
    return JSON.stringify(entry).length;
  } catch {
    return 0;
  }
}

/** Append a journal entry, then evict oldest entries beyond ~5MB per course. */
export async function appendEntry(entry: JournalEntry): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(STORE, "readwrite");
  await promisify(tx.objectStore(STORE).add({ ...entry }));

  const entries = await entriesForCourse(entry.courseId);
  let total = entries.reduce((sum, item) => sum + entrySize(item), 0);
  if (total <= MAX_BYTES_PER_COURSE) return;
  const evictTx = db.transaction(STORE, "readwrite");
  const store = evictTx.objectStore(STORE);
  for (const oldest of entries) {
    if (total <= MAX_BYTES_PER_COURSE) break;
    if (oldest.key === undefined) continue;
    await promisify(store.delete(oldest.key));
    total -= entrySize(oldest);
    console.warn("Journal cap reached; evicted oldest entry for", entry.courseId);
  }
}

/** Prune acknowledged entries: everything for the course at or before upToAt. */
export async function ackEntries(courseId: string, upToAt: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const entries = await entriesForCourse(courseId);
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  for (const entry of entries) {
    if (entry.at <= upToAt && entry.key !== undefined) {
      await promisify(store.delete(entry.key));
    }
  }
}

/** All unacknowledged entries for a course, oldest first. */
export async function listUnacked(courseId: string): Promise<JournalEntry[]> {
  return entriesForCourse(courseId);
}

/** Clear the journal for one course, or entirely when no course is given. */
export async function clear(courseId?: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  if (courseId === undefined) {
    const tx = db.transaction(STORE, "readwrite");
    await promisify(tx.objectStore(STORE).clear());
    return;
  }
  const entries = await entriesForCourse(courseId);
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  for (const entry of entries) {
    if (entry.key !== undefined) await promisify(store.delete(entry.key));
  }
}
