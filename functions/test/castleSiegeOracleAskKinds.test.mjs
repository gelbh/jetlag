import assert from "node:assert/strict";
import test from "node:test";
import {
  answerOracleAsk,
  encryptSealPayloadForTests,
  TEST_SEAL_WRAP_KEY_BYTES,
  TEST_SEAL_WRAP_KEY_ID,
} from "../session/castleSiege/answerOracleAsk.mjs";

const ANCHOR = { name: "Keep", lat: 53.35, lng: -6.26, secret: "phrase" };
const PLAINTEXT = `${ANCHOR.name}|${ANCHOR.lat}|${ANCHOR.lng}|${ANCHOR.secret}`;

function assertNoCoordLeak(receipt) {
  const blob = JSON.stringify(receipt);
  assert.equal(blob.includes(String(ANCHOR.lat)), false);
  assert.equal(blob.includes(String(ANCHOR.lng)), false);
  assert.equal(blob.includes(ANCHOR.secret), false);
  assert.equal(blob.includes(ANCHOR.name), false);
  assert.equal("lat" in receipt, false);
  assert.equal("lng" in receipt, false);
}

async function sealed() {
  const envelope = await encryptSealPayloadForTests(PLAINTEXT, {
    wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
    keyId: TEST_SEAL_WRAP_KEY_ID,
  });
  return {
    envelope,
    wrappingKey: TEST_SEAL_WRAP_KEY_BYTES,
  };
}

test("Matching: yes when nearest feature id matches seeker", async () => {
  const base = await sealed();
  const receipt = await answerOracleAsk({
    ...base,
    ask: {
      kind: "matching",
      seekerFeatureId: "ward-a",
      features: [
        { id: "ward-a", lat: 53.3502, lng: -6.2602 },
        { id: "ward-b", lat: 53.4, lng: -6.3 },
      ],
    },
  });
  assert.deepEqual(receipt, { kind: "matching", answer: "yes" });
  assertNoCoordLeak(receipt);
});

test("Matching: no when nearest feature differs; null when none", async () => {
  const base = await sealed();
  const no = await answerOracleAsk({
    ...base,
    ask: {
      kind: "matching",
      seekerFeatureId: "ward-b",
      features: [
        { id: "ward-a", lat: 53.3502, lng: -6.2602 },
        { id: "ward-b", lat: 53.4, lng: -6.3 },
      ],
    },
  });
  assert.deepEqual(no, { kind: "matching", answer: "no" });

  const empty = await answerOracleAsk({
    ...base,
    ask: { kind: "matching", seekerFeatureId: "ward-a", features: [] },
  });
  assert.deepEqual(empty, { kind: "matching", answer: "null" });
  assertNoCoordLeak(empty);
});

test("Measuring: closer/further vs seeker to target point", async () => {
  const base = await sealed();
  const closer = await answerOracleAsk({
    ...base,
    ask: {
      kind: "measuring",
      seekerPoint: { lat: 53.4, lng: -6.3 },
      targetPoint: { lat: 53.351, lng: -6.261 },
    },
  });
  assert.deepEqual(closer, { kind: "measuring", answer: "closer" });

  const further = await answerOracleAsk({
    ...base,
    ask: {
      kind: "measuring",
      seekerPoint: { lat: 53.3501, lng: -6.2601 },
      targetPoint: { lat: 53.5, lng: -6.5 },
    },
  });
  assert.deepEqual(further, { kind: "measuring", answer: "further" });
  assertNoCoordLeak(further);
});

test("Tentacle: nearest poi id or out-of-reach", async () => {
  const base = await sealed();
  const hit = await answerOracleAsk({
    ...base,
    ask: {
      kind: "tentacle",
      center: { lat: 53.35, lng: -6.26 },
      radiusMeters: 2000,
      pois: [
        { id: "poi-far", lat: 53.36, lng: -6.27 },
        { id: "poi-near", lat: 53.3505, lng: -6.2605 },
      ],
    },
  });
  assert.deepEqual(hit, { kind: "tentacle", answer: "poi-near" });

  const miss = await answerOracleAsk({
    ...base,
    ask: {
      kind: "tentacle",
      center: { lat: 54.0, lng: -7.0 },
      radiusMeters: 100,
      pois: [{ id: "poi-near", lat: 53.3505, lng: -6.2605 }],
    },
  });
  assert.deepEqual(miss, { kind: "tentacle", answer: "out-of-reach" });
  assertNoCoordLeak(miss);
});

test("Photo-mirror: obligation receipt without coords", async () => {
  const base = await sealed();
  const receipt = await answerOracleAsk({
    ...base,
    ask: { kind: "photo", categoryId: "tree" },
  });
  assert.deepEqual(receipt, {
    kind: "photo",
    answer: "mirror",
    mirror: { required: true, categoryId: "tree" },
  });
  assertNoCoordLeak(receipt);
});

test("Compass: cardinal from ask point toward sealed anchor", async () => {
  const base = await sealed();
  const receipt = await answerOracleAsk({
    ...base,
    ask: {
      kind: "compass",
      point: { lat: 53.34, lng: -6.26 },
    },
  });
  assert.equal(receipt.kind, "compass");
  assert.equal(receipt.answer, "N");
  assertNoCoordLeak(receipt);
});

test("rejects when committed hash does not match decrypted plaintext", async () => {
  const base = await sealed();
  await assert.rejects(
    () =>
      answerOracleAsk({
        ...base,
        committedHash: "a".repeat(64),
        ask: { kind: "photo" },
      }),
    /ORACLE_HASH_MISMATCH/,
  );
});

test("rejects oversized matching feature lists", async () => {
  const { assertOracleAskBounded } = await import("../session/castleSiege/answerOracleAsk.mjs");
  assert.throws(
    () =>
      assertOracleAskBounded({
        kind: "matching",
        features: Array.from({ length: 65 }, (_, i) => ({ id: String(i), lat: 0, lng: 0 })),
      }),
    /exceeds 64 items/,
  );
});
