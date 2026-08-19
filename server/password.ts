import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

/** Normalizes email once at the trust boundary before storage or lookup. */
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Stores a salted scrypt hash, never the original password. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${key.toString("hex")}`;
}

/** Compares a submitted password against its stored salted hash. */
export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, expectedHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
