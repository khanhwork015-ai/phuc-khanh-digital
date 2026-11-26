import { createHash, pbkdf2Sync, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

/**
 * Accounts migrated from the old approval-ui keep their PBKDF2 hash:
 * `pbkdf2$<iterations>$<salt_b64>$<hash_b64>` (sha256), so users keep their old password.
 */
function verifyLegacyPbkdf2(password: string, storedHash: string): boolean {
  const [, iterRaw, saltB64, hashB64] = storedHash.split("$");
  const iterations = Number.parseInt(iterRaw ?? "", 10);
  if (!iterations || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = pbkdf2Sync(password, Buffer.from(saltB64, "base64"), iterations, expected.length, "sha256");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function isLegacyPasswordHash(storedHash: string): boolean {
  return storedHash.startsWith("pbkdf2$");
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (isLegacyPasswordHash(storedHash)) return verifyLegacyPbkdf2(password, storedHash);
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const expectedBuffer = Buffer.from(keyHex, "hex");
  const actualBuffer = scryptSync(password, salt, 64);
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
