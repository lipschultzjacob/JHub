// Confirms an incoming webhook request genuinely came from Plaid, not
// someone else pretending to be Plaid. This matters because our webhook
// endpoint is a public URL -- without this check, anyone who found it could
// send us a fake "new transaction" message.
//
// Plaid signs every webhook with a JWT (a signed token) in the
// "Plaid-Verification" request header. Verifying it means: 1) look up the
// public key Plaid used to sign it, 2) check the signature is valid, 3)
// check the token isn't old/replayed, and 4) check the token's fingerprint
// of the request body matches the body we actually received (so the body
// itself couldn't have been tampered with in transit).
import { createHash } from "node:crypto";
import { importJWK, jwtVerify, decodeProtectedHeader } from "jose";
import { plaidClient } from "@/lib/plaid";

// Verification keys rarely change and Plaid asks callers not to fetch them
// on every single request -- this cache keeps each key around for the
// lifetime of this server process (a serverless function instance) instead
// of re-fetching it on every webhook.
const keyCache = new Map<string, object>();

async function getVerificationKey(keyId: string) {
  const cached = keyCache.get(keyId);
  if (cached) return cached;

  const response = await plaidClient.webhookVerificationKeyGet({ key_id: keyId });
  const jwk = response.data.key;
  keyCache.set(keyId, jwk);
  return jwk;
}

// Returns true if this request body really came from Plaid. `rawBody` must
// be the exact, unparsed request body text -- verifying a re-serialized
// version of the JSON wouldn't reliably match Plaid's fingerprint of the
// original bytes.
export async function verifyPlaidWebhook(
  rawBody: string,
  verificationHeader: string | null
): Promise<boolean> {
  if (!verificationHeader) return false;

  try {
    const { kid } = decodeProtectedHeader(verificationHeader);
    if (!kid) return false;

    const jwk = await getVerificationKey(kid);
    const key = await importJWK(jwk, "ES256");

    const { payload } = await jwtVerify(verificationHeader, key, {
      maxTokenAge: "5 min", // rejects an old/replayed webhook message
    });

    const bodyHash = createHash("sha256").update(rawBody).digest("hex");
    return payload.request_body_sha256 === bodyHash;
  } catch {
    // Any failure here (bad signature, expired token, malformed header, ...)
    // means "not verified" -- never treat an error as a pass.
    return false;
  }
}
