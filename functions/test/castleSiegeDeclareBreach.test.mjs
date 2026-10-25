import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encryptSealPayloadForTests,
  TEST_SEAL_WRAP_KEY_BYTES,
  TEST_SEAL_WRAP_KEY_ID,
} from "../session/castleSiege/answerOracleAsk.mjs";
import { evaluateDeclareBreach } from "../session/castleSiege/declareBreach.mjs";

const PLAINTEXT = "Spire Hall|53.35|-6.26|secret-phrase";

async function envelope() {
  return encryptSealPayloadForTests(PLAINTEXT, {
    wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
    keyId: TEST_SEAL_WRAP_KEY_ID,
  });
}

describe("evaluateDeclareBreach", () => {
  it("breaches when guess is within tolerance of sealed coords", async () => {
    const result = await evaluateDeclareBreach({
      envelope: await envelope(),
      wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
      declaringTeam: "teamA",
      namedAnchor: "Spire Hall",
      guessLat: 53.3501,
      guessLng: -6.2601,
      breachToleranceMeters: 50,
    });
    assert.equal(result.outcome, "breach");
    assert.equal(typeof result.distanceMeters, "number");
    assert.equal("withinTolerance" in result, false);
    assert.equal("lat" in result, false);
    assert.equal("lng" in result, false);
  });

  it("misfires when guess is outside tolerance", async () => {
    const result = await evaluateDeclareBreach({
      envelope: await envelope(),
      wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
      declaringTeam: "teamB",
      namedAnchor: "Spire Hall",
      guessLat: 53.4,
      guessLng: -6.3,
      breachToleranceMeters: 50,
    });
    assert.equal(result.outcome, "misfire");
  });

  it("misfires when named anchor does not match sealed name", async () => {
    const result = await evaluateDeclareBreach({
      envelope: await envelope(),
      wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
      declaringTeam: "teamA",
      namedAnchor: "Wrong Place",
      guessLat: 53.3501,
      guessLng: -6.2601,
      breachToleranceMeters: 50,
    });
    assert.equal(result.outcome, "misfire");
  });
});
