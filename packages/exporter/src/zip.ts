import type { PackageFile } from "./types.js";

/**
 * Pure TypeScript deterministic zip writer (no dependencies, browser and
 * node safe): STORE method only, entries sorted by path, fixed DOS
 * timestamp, table-based CRC32. Same input bytes always produce a
 * byte-identical archive (SPEC section 2: reproducible builds).
 */

let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable !== null) {
    return crcTable;
  }
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  crcTable = table;
  return table;
}

export function crc32(data: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = (table[(crc ^ (data[i] as number)) & 0xff] as number) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date: Date): { dosDate: number; dosTime: number } {
  const year = date.getUTCFullYear();
  if (year < 1980 || year > 2107) {
    throw new Error(`Zip timestamps must be between 1980 and 2107, got ${year}.`);
  }
  const dosDate =
    ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  const dosTime =
    (date.getUTCHours() << 11) |
    (date.getUTCMinutes() << 5) |
    (date.getUTCSeconds() >> 1);
  return { dosDate, dosTime };
}

function validateZipPath(path: string): void {
  if (path.length === 0) {
    throw new Error("Zip entry path must be non-empty.");
  }
  if (path.includes("\\")) {
    throw new Error(`Zip entry path must use forward slashes: ${path}`);
  }
  if (path.startsWith("/")) {
    throw new Error(`Zip entry path must be relative: ${path}`);
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`Zip entry path contains invalid segments: ${path}`);
  }
}

const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const EOCD_SIZE = 22;
const VERSION = 20; // 2.0: plain STORE entries.
const FLAG_UTF8 = 0x0800;
const METHOD_STORE = 0;
const MAX_U16 = 0xffff;
const MAX_U32 = 0xffffffff;

export function buildZip(
  files: PackageFile[],
  options: { fixedTimestamp?: Date } = {},
): Uint8Array {
  const timestamp = options.fixedTimestamp ?? new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
  const { dosDate, dosTime } = toDosDateTime(timestamp);
  const encoder = new TextEncoder();

  const entries = [...files]
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((file) => {
      validateZipPath(file.path);
      return {
        path: file.path,
        nameBytes: encoder.encode(file.path),
        data: file.data,
        crc: crc32(file.data),
        offset: 0,
      };
    });

  if (entries.length > MAX_U16) {
    throw new Error("Too many zip entries (zip64 is not supported).");
  }
  for (let i = 1; i < entries.length; i += 1) {
    if ((entries[i] as { path: string }).path === (entries[i - 1] as { path: string }).path) {
      throw new Error(`Duplicate zip entry path: ${(entries[i] as { path: string }).path}`);
    }
  }

  let localSize = 0;
  let centralSize = 0;
  for (const entry of entries) {
    if (entry.data.length > MAX_U32) {
      throw new Error(`Zip entry too large: ${entry.path}`);
    }
    if (entry.nameBytes.length > MAX_U16) {
      throw new Error(`Zip entry path too long: ${entry.path}`);
    }
    localSize += LOCAL_HEADER_SIZE + entry.nameBytes.length + entry.data.length;
    centralSize += CENTRAL_HEADER_SIZE + entry.nameBytes.length;
  }
  const total = localSize + centralSize + EOCD_SIZE;
  if (total > MAX_U32) {
    throw new Error("Zip archive too large (zip64 is not supported).");
  }

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let cursor = 0;
  const u16 = (value: number): void => {
    view.setUint16(cursor, value, true);
    cursor += 2;
  };
  const u32 = (value: number): void => {
    view.setUint32(cursor, value >>> 0, true);
    cursor += 4;
  };
  const bytes = (data: Uint8Array): void => {
    out.set(data, cursor);
    cursor += data.length;
  };

  for (const entry of entries) {
    entry.offset = cursor;
    u32(0x04034b50); // local file header signature
    u16(VERSION); // version needed to extract
    u16(FLAG_UTF8); // general purpose flags
    u16(METHOD_STORE); // compression method
    u16(dosTime);
    u16(dosDate);
    u32(entry.crc);
    u32(entry.data.length); // compressed size (STORE: same)
    u32(entry.data.length); // uncompressed size
    u16(entry.nameBytes.length);
    u16(0); // extra field length
    bytes(entry.nameBytes);
    bytes(entry.data);
  }

  const centralStart = cursor;
  for (const entry of entries) {
    u32(0x02014b50); // central directory header signature
    u16(VERSION); // version made by
    u16(VERSION); // version needed to extract
    u16(FLAG_UTF8);
    u16(METHOD_STORE);
    u16(dosTime);
    u16(dosDate);
    u32(entry.crc);
    u32(entry.data.length);
    u32(entry.data.length);
    u16(entry.nameBytes.length);
    u16(0); // extra field length
    u16(0); // file comment length
    u16(0); // disk number start
    u16(0); // internal file attributes
    u32(0); // external file attributes
    u32(entry.offset); // relative offset of local header
    bytes(entry.nameBytes);
  }
  const centralEnd = cursor;

  u32(0x06054b50); // end of central directory signature
  u16(0); // number of this disk
  u16(0); // disk where central directory starts
  u16(entries.length);
  u16(entries.length);
  u32(centralEnd - centralStart);
  u32(centralStart);
  u16(0); // comment length

  return out;
}
