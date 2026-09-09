// Encrypts/decrypts values before they're stored in the database -- used for
// the Plaid access_token (see src/db/schema.ts), which is a long-lived
// credential that lets whoever holds it read someone's real bank data. If
// the database were ever exposed (a leaked connection string, a compromised
// hosting account, ...), a plain-text access_token would hand that data
// straight over; encrypting it means a database leak alone isn't enough --
// the attacker would also need this separate key, which only lives in
// environment variables, never in the database itself.
//
// Uses AES-256-GCM: a standard, widely-used encryption method that also
// detects tampering (if the stored value were altered, decrypting it fails
// loudly instead of silently returning corrupted data).
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const IV_LENGTH = 12; // bytes -- the recommended IV size for AES-GCM
const AUTH_TAG_LENGTH = 16; // bytes -- GCM's fixed tag size

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY is not set (check .env.local)");
  }
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }
  return buf;
}

// Encrypts a string, returning a single base64 string that decrypt() can
// turn back into the original. Each call uses a fresh random IV (part of
// how AES-GCM works), so encrypting the same plaintext twice produces two
// different outputs -- that's expected, not a bug.
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Bundle iv + authTag + ciphertext into one value so there's only a single
  // column to store, instead of three.
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decrypt(encoded: string): string {
  const data = Buffer.from(encoded, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
