import test from "node:test";
import assert from "node:assert/strict";
import {
  hashRolePasscode,
  newRoleSecret,
  normalizeRolePasscode,
  verifyRolePasscode,
} from "../session/rolePasscodes.mjs";

test("normalizeRolePasscode uppercases and strips spaces", () => {
  assert.equal(normalizeRolePasscode(" ab cd "), "ABCD");
});

test("verifyRolePasscode matches stored secret", () => {
  const secret = newRoleSecret();
  assert.equal(verifyRolePasscode(secret, secret.code), true);
  assert.equal(verifyRolePasscode(secret, "WRNG"), false);
});

test("hashRolePasscode is deterministic for salt and code", () => {
  const hash = hashRolePasscode("salt", "ABCD");
  assert.equal(hashRolePasscode("salt", "ABCD"), hash);
});
