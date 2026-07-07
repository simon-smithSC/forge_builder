import { describe, expect, it } from "vitest";
import { buildZip, crc32 } from "./zip.js";
import type { PackageFile } from "./types.js";

const encoder = new TextEncoder();
const file = (path: string, text: string): PackageFile => ({
  path,
  data: encoder.encode(text),
});

function readU32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(offset, true);
}

function readU16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint16(offset, true);
}

/** Walk the central directory and return entry names in order. */
function centralDirectoryNames(zip: Uint8Array): string[] {
  const eocdOffset = zip.length - 22;
  expect(readU32(zip, eocdOffset)).toBe(0x06054b50);
  const count = readU16(zip, eocdOffset + 10);
  let cursor = readU32(zip, eocdOffset + 16);
  const names: string[] = [];
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i += 1) {
    expect(readU32(zip, cursor)).toBe(0x02014b50);
    const nameLength = readU16(zip, cursor + 28);
    const extraLength = readU16(zip, cursor + 30);
    const commentLength = readU16(zip, cursor + 32);
    names.push(decoder.decode(zip.subarray(cursor + 46, cursor + 46 + nameLength)));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return names;
}

describe("crc32", () => {
  it("matches known vectors", () => {
    expect(crc32(encoder.encode(""))).toBe(0);
    expect(crc32(encoder.encode("123456789"))).toBe(0xcbf43926);
    expect(crc32(encoder.encode("abc"))).toBe(0x352441c2);
  });
});

describe("buildZip", () => {
  it("is byte-identical across runs (deterministic)", () => {
    const files = [file("b.txt", "bravo"), file("a/a.txt", "alpha")];
    const first = buildZip(files);
    const second = buildZip([...files].reverse());
    expect(first.length).toBe(second.length);
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
  });

  it("sorts entries by path", () => {
    const zip = buildZip([
      file("lib/player.js", "js"),
      file("index.html", "html"),
      file("assets/a.png", "png"),
      file("tincan.xml", "xml"),
    ]);
    expect(centralDirectoryNames(zip)).toEqual([
      "assets/a.png",
      "index.html",
      "lib/player.js",
      "tincan.xml",
    ]);
  });

  it("writes STORE local headers with the fixed default timestamp", () => {
    const zip = buildZip([file("a.txt", "abc")]);
    expect(readU32(zip, 0)).toBe(0x04034b50); // local header signature
    expect(readU16(zip, 8)).toBe(0); // method STORE
    // 2026-01-01 00:00:00 UTC
    expect(readU16(zip, 10)).toBe(0); // dos time
    expect(readU16(zip, 12)).toBe(((2026 - 1980) << 9) | (1 << 5) | 1); // dos date
    expect(readU32(zip, 14)).toBe(0x352441c2); // crc of "abc"
    expect(readU32(zip, 18)).toBe(3); // compressed size
    expect(readU32(zip, 22)).toBe(3); // uncompressed size
  });

  it("honors fixedTimestamp option", () => {
    const zip = buildZip([file("a.txt", "abc")], {
      fixedTimestamp: new Date(Date.UTC(2030, 5, 15, 12, 30, 40)),
    });
    expect(readU16(zip, 10)).toBe((12 << 11) | (30 << 5) | (40 >> 1));
    expect(readU16(zip, 12)).toBe(((2030 - 1980) << 9) | (6 << 5) | 15);
  });

  it("rejects unsafe or duplicate paths", () => {
    expect(() => buildZip([file("/abs.txt", "x")])).toThrow(/relative/);
    expect(() => buildZip([file("a/../b.txt", "x")])).toThrow(/invalid segments/);
    expect(() => buildZip([file("a\\b.txt", "x")])).toThrow(/forward slashes/);
    expect(() => buildZip([file("a.txt", "x"), file("a.txt", "y")])).toThrow(
      /Duplicate/,
    );
  });

  it("round-trips entry data at the recorded offsets", () => {
    const files = [file("one.txt", "first"), file("two.txt", "second")];
    const zip = buildZip(files);
    const decoder = new TextDecoder();
    // First local header: name starts at 30, data follows.
    const nameLength = readU16(zip, 26);
    const name = decoder.decode(zip.subarray(30, 30 + nameLength));
    expect(name).toBe("one.txt");
    const data = decoder.decode(
      zip.subarray(30 + nameLength, 30 + nameLength + 5),
    );
    expect(data).toBe("first");
  });
});
