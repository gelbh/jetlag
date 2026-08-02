import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const ROLE_PASSCODE_LENGTH = 4;

export function normalizeRolePasscode(input) {
  return typeof input === "string"
    ? input.replace(/\s+/g, "").toUpperCase()
    : "";
}

export function generateRolePasscode() {
  let code = "";

  for (let index = 0; index < ROLE_PASSCODE_LENGTH; index += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }

  return code;
}

export function hashRolePasscode(salt, code) {
  const normalized = normalizeRolePasscode(code);
  return scryptSync(normalized, salt, 32).toString("hex");
}

export function verifyRolePasscode(record, code) {
  if (!record || typeof record !== "object") {
    return false;
  }

  const salt = typeof record.salt === "string" ? record.salt : "";
  const hash = typeof record.hash === "string" ? record.hash : "";
  if (!salt || !hash) {
    return false;
  }

  const candidate = hashRolePasscode(salt, code);
  if (candidate.length !== hash.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(hash, "hex"));
}

export function newRoleSecret() {
  const code = generateRolePasscode();
  const salt = randomBytes(16).toString("hex");
  return {
    salt,
    hash: hashRolePasscode(salt, code),
    code,
  };
}
