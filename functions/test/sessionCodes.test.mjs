import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateSessionCode } from "../session/sessionCodes.mjs";

describe("sessionCodes", () => {
  it("generates a 4-letter code from the session alphabet", () => {
    const code = generateSessionCode();
    assert.match(code, /^[A-HJ-NP-Z]{4}$/);
  });

  it("generates distinct codes across repeated calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateSessionCode()));
    assert.ok(codes.size > 1);
  });
});
