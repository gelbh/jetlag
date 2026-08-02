import test from "node:test";
import assert from "node:assert/strict";
import {
  generateRolePasscode,
  newRoleSecret,
  normalizeRolePasscode,
  verifyRolePasscode,
} from "../session/rolePasscodes.mjs";

test("normalizeRolePasscode uppercases and strips spaces", () => {
  assert.equal(normalizeRolePasscode(" ab cd "), "ABCD");
});

test("verifyRolePasscode matches stored plaintext secret", () => {
  const secret = newRoleSecret();
  assert.equal(verifyRolePasscode(secret, secret.code), true);
  assert.equal(verifyRolePasscode(secret, "WRNG"), false);
});

test("generateRolePasscode returns 4 alphabet chars", () => {
  const code = generateRolePasscode();
  assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
});

test("newRoleSecret stores plaintext code only", () => {
  const secret = newRoleSecret();
  assert.match(secret.code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
  assert.equal(secret.hash, undefined);
  assert.equal(secret.salt, undefined);
});
