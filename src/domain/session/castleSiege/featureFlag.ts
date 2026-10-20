export const CASTLE_SIEGE_MODE_FLAG_KEY = "castle-siege-mode";

const TRUTHY_STRINGS = new Set(["true", "on", "enabled"]);

export function isCastleSiegeFlagEnabled(value: unknown): boolean {
  if (value === true) {
    return true;
  }
  if (value === false) {
    return false;
  }
  if (typeof value === "string") {
    return TRUTHY_STRINGS.has(value.toLowerCase());
  }
  return false;
}
