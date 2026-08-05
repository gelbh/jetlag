import test from "node:test";
import assert from "node:assert/strict";
import {
  createPreloadRequestHandler,
  PRELOAD_INVALID_SNAPSHOT,
  PRELOAD_PAYLOAD_TOO_LARGE,
  PRELOAD_RATE_LIMITED,
  PRELOAD_UNAUTHENTICATED,
} from "../preloadRequest/createPreloadRequest.mjs";

function mockDb() {
  const docs = new Map();

  function docRef(id) {
    return {
      id,
      set: async (data) => {
        docs.set(id, { ...(docs.get(id) ?? {}), ...data });
      },
      update: async (data) => {
        docs.set(id, { ...(docs.get(id) ?? {}), ...data });
      },
    };
  }

  return {
    collection: (name) => {
      assert.equal(name, "preloadRequests");
      return { doc: (id) => docRef(id) };
    },
    _docs: docs,
  };
}

function baseInput(overrides = {}) {
  return {
    uid: "reporter-1",
    note: "Please preload Cork",
    presetSnapshot: {
      name: "Cork weekend",
      placeLabel: "Cork, Ireland",
      gameSize: "medium",
      distanceUnit: "metric",
      focusBounds: { south: 51.8, west: -8.6, north: 51.95, east: -8.35 },
      gameAreaBytes: 1200,
      evilKey: "drop-me",
    },
    ...overrides,
  };
}

function baseDeps(overrides = {}) {
  let counter = 0;
  return {
    rateLimit: async () => ({ allowed: true }),
    sendEmail: async () => ({ messageId: "email-1" }),
    now: () => new Date("2026-08-05T12:00:00.000Z"),
    generateId: () => `id-${(counter += 1)}`,
    requestUrlBase: "https://jetlag.gelbhart.dev",
    ...overrides,
  };
}

test("createPreloadRequestHandler writes doc and returns id", async () => {
  const db = mockDb();
  const result = await createPreloadRequestHandler(db, baseInput(), baseDeps());

  assert.equal(result.requestId, "id-1");
  assert.equal(result.status, "open");

  const doc = db._docs.get("id-1");
  assert.equal(doc.status, "open");
  assert.equal(doc.reporterUid, "reporter-1");
  assert.equal(doc.note, "Please preload Cork");
  assert.equal(doc.presetSnapshot.name, "Cork weekend");
  assert.equal(doc.presetSnapshot.evilKey, undefined);
  assert.equal(doc.presetSnapshot.gameAreaBytes, 1200);
});

test("createPreloadRequestHandler records the email message id", async () => {
  const db = mockDb();
  const sent = [];
  await createPreloadRequestHandler(
    db,
    baseInput(),
    baseDeps({
      sendEmail: async (payload) => {
        sent.push(payload);
        return { messageId: "email-xyz" };
      },
    }),
  );

  assert.equal(sent.length, 1);
  assert.equal(sent[0].subject, "Preload request: Cork weekend");
  assert.match(sent[0].incidentUrl, /\/admin\/preload-requests\/id-1$/);

  const doc = db._docs.get("id-1");
  assert.equal(doc.email.messageId, "email-xyz");
  assert.equal(doc.email.sentAt, "2026-08-05T12:00:00.000Z");
});

test("createPreloadRequestHandler still creates when email fails", async () => {
  const db = mockDb();
  const result = await createPreloadRequestHandler(
    db,
    baseInput(),
    baseDeps({
      sendEmail: async () => {
        throw new Error("INCIDENT_EMAIL_MISCONFIGURED:secret");
      },
    }),
  );

  assert.equal(result.requestId, "id-1");
  const doc = db._docs.get("id-1");
  assert.equal(doc.status, "open");
  assert.equal(doc.email.error, "email_failed");
});

test("createPreloadRequestHandler enforces the rate limit", async () => {
  const db = mockDb();
  await assert.rejects(
    createPreloadRequestHandler(
      db,
      baseInput(),
      baseDeps({
        rateLimit: async () => ({ allowed: false, retryAfterMs: 1000 }),
      }),
    ),
    (error) => error.message === PRELOAD_RATE_LIMITED,
  );
  assert.equal(db._docs.size, 0);
});

test("createPreloadRequestHandler rejects missing auth", async () => {
  const db = mockDb();
  await assert.rejects(
    createPreloadRequestHandler(db, baseInput({ uid: null }), baseDeps()),
    (error) => error.message === PRELOAD_UNAUTHENTICATED,
  );
});

test("createPreloadRequestHandler rejects invalid snapshot", async () => {
  const db = mockDb();
  await assert.rejects(
    createPreloadRequestHandler(
      db,
      baseInput({
        presetSnapshot: { name: "x", gameSize: "huge", distanceUnit: "metric" },
      }),
      baseDeps(),
    ),
    (error) => error.message === PRELOAD_INVALID_SNAPSHOT,
  );
});

test("createPreloadRequestHandler rejects oversized snapshot", async () => {
  const db = mockDb();
  await assert.rejects(
    createPreloadRequestHandler(
      db,
      baseInput({
        presetSnapshot: {
          name: "Huge",
          gameSize: "medium",
          distanceUnit: "metric",
          placeLabel: "x".repeat(20_000),
        },
      }),
      baseDeps(),
    ),
    (error) => error.message === PRELOAD_PAYLOAD_TOO_LARGE,
  );
});

test("createPreloadRequestHandler clamps the note to 140 characters", async () => {
  const db = mockDb();
  await createPreloadRequestHandler(
    db,
    baseInput({ note: "a".repeat(200) }),
    baseDeps(),
  );
  const doc = db._docs.get("id-1");
  assert.equal(doc.note.length, 140);
});
