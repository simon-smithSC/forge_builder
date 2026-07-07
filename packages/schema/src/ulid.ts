const crockfordBase32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const ULID_PATTERN = "^[0-7][0-9A-HJKMNP-TV-Z]{25}$";
const ulidPattern = new RegExp(ULID_PATTERN);

const encodeTime = (timeMs: number): string => {
  if (!Number.isSafeInteger(timeMs) || timeMs < 0 || timeMs > 0xffffffffffff) {
    throw new Error("ULID timestamp must fit in 48 bits.");
  }

  let value = BigInt(timeMs);
  let encoded = "";
  for (let index = 0; index < 10; index += 1) {
    encoded = crockfordBase32[Number(value & 31n)] + encoded;
    value >>= 5n;
  }
  return encoded;
};

const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  globalThis.crypto?.getRandomValues(bytes);

  if (bytes.some((byte) => byte !== 0)) {
    return bytes;
  }

  for (let index = 0; index < length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  return bytes;
};

const encodeRandom = (): string => {
  const bytes = randomBytes(10);
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  let encoded = "";
  for (let index = 0; index < 16; index += 1) {
    encoded = crockfordBase32[Number(value & 31n)] + encoded;
    value >>= 5n;
  }
  return encoded;
};

export function isUlid(value: string): boolean {
  return ulidPattern.test(value);
}

export function createUlid(timeMs = Date.now()): string {
  return `${encodeTime(timeMs)}${encodeRandom()}`;
}
