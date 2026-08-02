import { describe, expect, it } from "vitest";
import {
  generateRolePasscode,
  normalizeRolePasscode,
  ROLE_PASSCODE_LENGTH,
} from "./rolePasscode";

describe("normalizeRolePasscode", () => {
  it("uppercases and strips whitespace", () => {
    expect(normalizeRolePasscode(" ab cd ")).toBe("ABCD");
  });
});

describe("generateRolePasscode", () => {
  it("uses the session-code alphabet and length", () => {
    const code = generateRolePasscode();
    expect(code).toHaveLength(ROLE_PASSCODE_LENGTH);
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
  });
});
