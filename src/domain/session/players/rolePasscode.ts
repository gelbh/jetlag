const ROLE_PASSCODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const ROLE_PASSCODE_LENGTH = 4;

export function normalizeRolePasscode(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

/** CSPRNG role codes (matches functions/session/rolePasscodes.mjs). */
export function generateRolePasscode(): string {
  let code = "";
  const limit =
    ROLE_PASSCODE_ALPHABET.length *
    Math.floor(256 / ROLE_PASSCODE_ALPHABET.length);
  const bytes = new Uint8Array(ROLE_PASSCODE_LENGTH);

  while (code.length < ROLE_PASSCODE_LENGTH) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (code.length >= ROLE_PASSCODE_LENGTH) {
        break;
      }
      if (byte < limit) {
        code += ROLE_PASSCODE_ALPHABET[byte % ROLE_PASSCODE_ALPHABET.length];
      }
    }
  }

  return code;
}
