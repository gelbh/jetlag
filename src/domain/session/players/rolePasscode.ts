const ROLE_PASSCODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const ROLE_PASSCODE_LENGTH = 4;

export function normalizeRolePasscode(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export function generateRolePasscode(): string {
  let code = "";

  for (let index = 0; index < ROLE_PASSCODE_LENGTH; index += 1) {
    code +=
      ROLE_PASSCODE_ALPHABET[
        Math.floor(Math.random() * ROLE_PASSCODE_ALPHABET.length)
      ];
  }

  return code;
}
