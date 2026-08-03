import { describe, expect, it } from "vitest";
import {
  SESSION_CODE_ALPHABET,
  SESSION_CODE_INPUT_PLACEHOLDER,
  generateSessionCode,
  isValidSessionCode,
  normalizeSessionCode,
} from "./sessionCodes";

describe("sessionCodes", () => {
  it("derives the join placeholder from the alphabet SoT", () => {
    expect(SESSION_CODE_INPUT_PLACEHOLDER).toBe("ABCD");
    expect(SESSION_CODE_ALPHABET.startsWith(SESSION_CODE_INPUT_PLACEHOLDER)).toBe(
      true,
    );
    expect(SESSION_CODE_INPUT_PLACEHOLDER).not.toMatch(/[IO]/);
  });

  it("generates codes only from the alphabet SoT", () => {
    for (let i = 0; i < 20; i += 1) {
      const code = generateSessionCode();
      expect(code).toHaveLength(4);
      for (const char of code) {
        expect(SESSION_CODE_ALPHABET).toContain(char);
      }
    }
  });

  it("normalizes and validates four-letter codes", () => {
    expect(normalizeSessionCode("ab-cd")).toBe("ABCD");
    expect(isValidSessionCode("ABCD")).toBe(true);
    expect(isValidSessionCode("ABC")).toBe(false);
  });
});
