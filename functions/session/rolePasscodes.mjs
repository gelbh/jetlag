import { randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const ROLE_PASSCODE_LENGTH = 4;

export function normalizeRolePasscode(input) {
  return typeof input === "string"
    ? input.replace(/\s+/g, "").toUpperCase()
    : "";
}

/** Rejection-sample CSPRNG codes over the role-passcode alphabet. */
export function generateRolePasscode() {
  let code = "";
  const limit = ALPHABET.length * Math.floor(256 / ALPHABET.length);

  while (code.length < ROLE_PASSCODE_LENGTH) {
    const bytes = randomBytes(ROLE_PASSCODE_LENGTH);
    for (const byte of bytes) {
      if (code.length >= ROLE_PASSCODE_LENGTH) {
        break;
      }
      if (byte < limit) {
        code += ALPHABET[byte % ALPHABET.length];
      }
    }
  }

  return code;
}

/**
 * Admin-only secret doc stores plaintext for reveal/copy.
 * Clients cannot read `sessionRoleSecrets`; hashing adds no client-facing security.
 */
export function newRoleSecret() {
  return { code: generateRolePasscode() };
}

export function verifyRolePasscode(record, code) {
  if (!record || typeof record !== "object") {
    return false;
  }

  const expected = normalizeRolePasscode(
    typeof record.code === "string" ? record.code : "",
  );
  const candidate = normalizeRolePasscode(code);
  if (!expected || expected.length !== candidate.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(candidate));
}
