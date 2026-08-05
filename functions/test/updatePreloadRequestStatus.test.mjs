import assert from "node:assert/strict";
import test from "node:test";
import {
  PRELOAD_INVALID_STATUS,
  PRELOAD_INVALID_TRANSITION,
  PRELOAD_REQUEST_NOT_FOUND,
  updatePreloadRequestStatusHandler,
} from "../preloadRequest/updatePreloadRequestStatus.mjs";

function mockDb(docs) {
  return {
    collection(name) {
      assert.equal(name, "preloadRequests");
      return {
        doc(id) {
          return {
            async get() {
              const data = docs[id];
              return {
                exists: data != null,
                data: () => data,
              };
            },
            async update(patch) {
              docs[id] = { ...docs[id], ...patch };
            },
          };
        },
      };
    },
  };
}

const fixedNow = () => new Date("2026-08-05T12:00:00.000Z");

test("updatePreloadRequestStatusHandler accepts an open request", async () => {
  const docs = { "pre-1": { status: "open", updatedAt: "2026-08-01T00:00:00.000Z" } };
  const result = await updatePreloadRequestStatusHandler(
    mockDb(docs),
    { requestId: "pre-1", status: "accepted", uid: "admin" },
    { now: fixedNow },
  );
  assert.equal(result.status, "accepted");
  assert.equal(docs["pre-1"].status, "accepted");
  assert.equal(docs["pre-1"].updatedAt, "2026-08-05T12:00:00.000Z");
});

test("updatePreloadRequestStatusHandler ships an accepted request", async () => {
  const docs = { "pre-1": { status: "accepted" } };
  const result = await updatePreloadRequestStatusHandler(
    mockDb(docs),
    { requestId: "pre-1", status: "shipped", uid: "admin" },
    { now: fixedNow },
  );
  assert.equal(result.status, "shipped");
});

test("updatePreloadRequestStatusHandler rejects illegal transition", async () => {
  const docs = { "pre-1": { status: "shipped" } };
  await assert.rejects(
    () =>
      updatePreloadRequestStatusHandler(
        mockDb(docs),
        { requestId: "pre-1", status: "accepted", uid: "admin" },
        { now: fixedNow },
      ),
    (error) => error.message === PRELOAD_INVALID_TRANSITION,
  );
});

test("updatePreloadRequestStatusHandler rejects bad status", async () => {
  const docs = { "pre-1": { status: "open" } };
  await assert.rejects(
    () =>
      updatePreloadRequestStatusHandler(
        mockDb(docs),
        { requestId: "pre-1", status: "chatting", uid: "admin" },
        { now: fixedNow },
      ),
    (error) => error.message === PRELOAD_INVALID_STATUS,
  );
});

test("updatePreloadRequestStatusHandler rejects missing request", async () => {
  await assert.rejects(
    () =>
      updatePreloadRequestStatusHandler(
        mockDb({}),
        { requestId: "missing", status: "accepted", uid: "admin" },
        { now: fixedNow },
      ),
    (error) => error.message === PRELOAD_REQUEST_NOT_FOUND,
  );
});
