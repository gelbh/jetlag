import assert from "node:assert/strict";
import test from "node:test";
import {
  HEAL_PROOF_REQUIRED_SINCE,
  hashHealSecret,
  healSecretMatchesProof,
  sanitizeProofHash,
  sessionRequiresHealProof,
} from "../session/memberProofs.mjs";

// Same vector as src/domain/session/join/healSecret.test.ts.
const ABC_SHA256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

test("hashHealSecret is lowercase hex SHA-256 of the UTF-8 secret", () => {
  assert.equal(hashHealSecret("abc"), ABC_SHA256);
});

test("sanitizeProofHash accepts only 64 lowercase hex chars", () => {
  assert.equal(sanitizeProofHash(ABC_SHA256), ABC_SHA256);
  assert.equal(sanitizeProofHash(ABC_SHA256.toUpperCase()), undefined);
  assert.equal(sanitizeProofHash(ABC_SHA256.slice(1)), undefined);
  assert.equal(sanitizeProofHash(42), undefined);
  assert.equal(sanitizeProofHash(undefined), undefined);
});

test("healSecretMatchesProof compares the secret hash to the stored proof", () => {
  assert.equal(healSecretMatchesProof("abc", ABC_SHA256), true);
  assert.equal(healSecretMatchesProof("abd", ABC_SHA256), false);
  assert.equal(healSecretMatchesProof(undefined, ABC_SHA256), false);
  assert.equal(healSecretMatchesProof("", ABC_SHA256), false);
  assert.equal(healSecretMatchesProof("abc", "not-a-hash"), false);
});

test("sessionRequiresHealProof is off while HEAL_PROOF_REQUIRED_SINCE is null", () => {
  assert.equal(HEAL_PROOF_REQUIRED_SINCE, null);
  assert.equal(sessionRequiresHealProof({ createdAt: "2099-01-01T00:00:00.000Z" }), false);
});

test("sessionRequiresHealProof applies from the given cutoff on", () => {
  const cutoff = "2026-10-25T00:00:00.000Z";
  assert.equal(sessionRequiresHealProof({ createdAt: "2020-01-01T00:00:00.000Z" }, cutoff), false);
  assert.equal(sessionRequiresHealProof({ createdAt: cutoff }, cutoff), true);
  assert.equal(sessionRequiresHealProof({ createdAt: "2099-01-01T00:00:00.000Z" }, cutoff), true);
  assert.equal(sessionRequiresHealProof({}, cutoff), false);
  assert.equal(sessionRequiresHealProof(undefined, cutoff), false);
});
