import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveEnforceAppCheck } from "../lib/appCheck.mjs";

describe("resolveEnforceAppCheck", () => {
  it("enforces App Check when deployed", () => {
    assert.equal(resolveEnforceAppCheck({}), true);
  });

  it("enforces App Check when FUNCTIONS_EMULATOR is anything but true", () => {
    assert.equal(resolveEnforceAppCheck({ FUNCTIONS_EMULATOR: "false" }), true);
    assert.equal(resolveEnforceAppCheck({ FUNCTIONS_EMULATOR: "" }), true);
  });

  it("skips App Check in the Functions emulator", () => {
    assert.equal(resolveEnforceAppCheck({ FUNCTIONS_EMULATOR: "true" }), false);
  });
});
