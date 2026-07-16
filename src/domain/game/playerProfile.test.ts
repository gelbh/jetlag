import { describe, expect, it } from "vitest";
import {
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  validateUsername,
} from "./playerProfile";

describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername("  MapFox42  ")).toBe("mapfox42");
  });
});

describe("validateUsername", () => {
  it("accepts a valid username", () => {
    const result = validateUsername("MapFox_42");
    expect(result).toEqual({
      ok: true,
      username: "MapFox_42",
      normalized: "mapfox_42",
    });
  });

  it("trims surrounding whitespace before validating", () => {
    const result = validateUsername("  mapfox  ");
    expect(result).toEqual({
      ok: true,
      username: "mapfox",
      normalized: "mapfox",
    });
  });

  it("rejects an empty username", () => {
    const result = validateUsername("   ");
    expect(result.ok).toBe(false);
  });

  it("rejects usernames shorter than the minimum length", () => {
    const result = validateUsername("a".repeat(USERNAME_MIN_LENGTH - 1));
    expect(result).toEqual({
      ok: false,
      error: `Username must be at least ${USERNAME_MIN_LENGTH} characters.`,
    });
  });

  it("rejects usernames longer than the maximum length", () => {
    const result = validateUsername("a".repeat(USERNAME_MAX_LENGTH + 1));
    expect(result).toEqual({
      ok: false,
      error: `Username must be ${USERNAME_MAX_LENGTH} characters or fewer.`,
    });
  });

  it("accepts usernames at the length boundaries", () => {
    expect(validateUsername("a".repeat(USERNAME_MIN_LENGTH)).ok).toBe(true);
    expect(validateUsername("a".repeat(USERNAME_MAX_LENGTH)).ok).toBe(true);
  });

  it("rejects invalid characters", () => {
    const invalidUsernames = ["map fox", "map-fox", "map.fox", "map@fox", "🙂mapfox"];

    for (const raw of invalidUsernames) {
      const result = validateUsername(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(
          "Username can only use letters, numbers, and underscore.",
        );
      }
    }
  });

  it("rejects reserved usernames regardless of case", () => {
    const reserved = [
      "admin",
      "Jetlag",
      "OFFICIAL",
      "support",
      "System",
      "null",
      "undefined",
    ];

    for (const raw of reserved) {
      const result = validateUsername(raw);
      expect(result).toEqual({
        ok: false,
        error: "That username is reserved. Try another.",
      });
    }
  });
});
