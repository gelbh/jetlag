/** Session-code alphabet (excludes I/O). SoT for generate + input examples. */
export const SESSION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Join input placeholder — first four alphabet chars (not a live session id). */
export const SESSION_CODE_INPUT_PLACEHOLDER = SESSION_CODE_ALPHABET.slice(0, 4);

export function generateSessionCode(): string {
  let code = "";

  for (let index = 0; index < 4; index += 1) {
    code +=
      SESSION_CODE_ALPHABET[
        Math.floor(Math.random() * SESSION_CODE_ALPHABET.length)
      ];
  }

  return code;
}

export function normalizeSessionCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
}

export function isValidSessionCode(value: string): boolean {
  return /^[A-Z]{4}$/.test(value);
}
