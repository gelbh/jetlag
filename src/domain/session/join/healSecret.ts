const HEAL_SECRET_BYTES = 32;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 256-bit device secret behind a member's heal proof. It leaves the device only inside a heal call. */
export function generateHealSecret(): string {
  const bytes = new Uint8Array(HEAL_SECRET_BYTES);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/** Lowercase hex SHA-256 of the secret's UTF-8 bytes. Server twin: functions/session/memberProofs.mjs. */
export async function hashHealSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
