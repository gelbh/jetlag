import assert from "node:assert/strict";
import test from "node:test";
import {
  answerOracleAsk,
  encryptSealPayloadForTests,
  TEST_SEAL_WRAP_KEY_BYTES,
  TEST_SEAL_WRAP_KEY_ID,
} from "../session/castleSiege/answerOracleAsk.mjs";

/** Same canonical shape as client `canonicalSealPayload`. */
const ANCHOR = { name: "Castle", lat: 53.35, lng: -6.26, secret: "s3cret" };
const PLAINTEXT = `${ANCHOR.name}|${ANCHOR.lat}|${ANCHOR.lng}|${ANCHOR.secret}`;

function assertNoCoordLeak(receipt) {
  const blob = JSON.stringify(receipt);
  assert.equal(blob.includes(String(ANCHOR.lat)), false);
  assert.equal(blob.includes(String(ANCHOR.lng)), false);
  assert.equal(blob.includes(ANCHOR.secret), false);
  assert.equal(blob.includes(ANCHOR.name), false);
  assert.equal("lat" in receipt, false);
  assert.equal("lng" in receipt, false);
  assert.equal("coords" in receipt, false);
  assert.equal("anchor" in receipt, false);
}

async function fixtureEnvelope() {
  return encryptSealPayloadForTests(PLAINTEXT, {
    wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
    keyId: TEST_SEAL_WRAP_KEY_ID,
  });
}

test("V4 Radar: yes when sealed anchor is inside ask radius", async () => {
  const envelope = await fixtureEnvelope();
  const receipt = await answerOracleAsk({
    envelope,
    wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
    ask: {
      kind: "radar",
      point: { lat: 53.3501, lng: -6.2601 },
      radiusMeters: 500,
    },
  });

  assert.deepEqual(receipt, { kind: "radar", answer: "yes" });
  assertNoCoordLeak(receipt);
});

test("V4 Radar: no when sealed anchor is outside ask radius", async () => {
  const envelope = await fixtureEnvelope();
  const receipt = await answerOracleAsk({
    envelope,
    wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
    ask: {
      kind: "radar",
      point: { lat: 53.4, lng: -6.3 },
      radiusMeters: 100,
    },
  });

  assert.deepEqual(receipt, { kind: "radar", answer: "no" });
  assertNoCoordLeak(receipt);
});

test("Radar oracle rejects missing point or radius", async () => {
  const envelope = await fixtureEnvelope();
  await assert.rejects(
    () =>
      answerOracleAsk({
        envelope,
        wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
        ask: { kind: "radar", radiusMeters: 100 },
      }),
    /invalid radar ask/i,
  );
});

test("decrypt fails closed on wrong wrap key without leaking plaintext", async () => {
  const envelope = await fixtureEnvelope();
  const wrong = new Uint8Array(TEST_SEAL_WRAP_KEY_BYTES);
  wrong[0] ^= 0xff;

  await assert.rejects(
    () =>
      answerOracleAsk({
        envelope,
        wrappingKey: wrong,
        ask: {
          kind: "radar",
          point: { lat: 53.35, lng: -6.26 },
          radiusMeters: 50,
        },
      }),
    /decrypt|unwrap|seal/i,
  );
});
