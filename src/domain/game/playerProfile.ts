export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "admin",
  "jetlag",
  "official",
  "support",
  "system",
  "null",
  "undefined",
]);

export type ValidateUsernameResult =
  | { ok: true; username: string; normalized: string }
  | { ok: false; error: string };

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): ValidateUsernameResult {
  const username = raw.trim();

  if (username.length === 0) {
    return { ok: false, error: "Enter a username." };
  }

  if (username.length < USERNAME_MIN_LENGTH) {
    return {
      ok: false,
      error: `Username must be at least ${USERNAME_MIN_LENGTH} characters.`,
    };
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Username must be ${USERNAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      error: "Username can only use letters, numbers, and underscore.",
    };
  }

  const normalized = normalizeUsername(username);

  if (RESERVED_USERNAMES.has(normalized)) {
    return { ok: false, error: "That username is reserved. Try another." };
  }

  return { ok: true, username, normalized };
}
