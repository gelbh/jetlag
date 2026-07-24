import test from "node:test";
import assert from "node:assert/strict";
import {
  isOrphanSession,
  selectOrphanCodeDocs,
  sweepOrphanSessionCodes,
  ORPHAN_CODE_SWEEP_CURSOR_DOC,
} from "../session/orphanSessionCodes.mjs";

test("isOrphanSession true when session missing", () => {
  assert.equal(isOrphanSession(null), true);
});

test("isOrphanSession true when session ended", () => {
  assert.equal(isOrphanSession({ status: "ended" }), true);
});

test("isOrphanSession false for live active session", () => {
  assert.equal(isOrphanSession({ status: "active" }), false);
});

test("selectOrphanCodeDocs respects limit", () => {
  const selected = selectOrphanCodeDocs(
    [
      { codeData: { sessionId: "a" }, sessionData: null },
      { codeData: { sessionId: "b" }, sessionData: { status: "ended" } },
      { codeData: { sessionId: "c" }, sessionData: { status: "active" } },
    ],
    1,
  );
  assert.equal(selected.length, 1);
  assert.equal(selected[0].codeData.sessionId, "a");
});

function makeCodeDoc(id, sessionId) {
  return {
    id,
    data: () => ({ sessionId }),
    ref: {
      delete: async () => {
        /* set by caller */
      },
    },
  };
}

function buildSweepDb({
  codesByPage,
  sessions,
  deleted,
  cursorState,
}) {
  return {
    collection: (name) => {
      if (name === ORPHAN_CODE_SWEEP_CURSOR_DOC.collection) {
        return {
          doc: (id) => {
            assert.equal(id, ORPHAN_CODE_SWEEP_CURSOR_DOC.id);
            return {
              get: async () => ({
                exists: cursorState.lastCodeId != null,
                data: () =>
                  cursorState.lastCodeId != null
                    ? { lastCodeId: cursorState.lastCodeId }
                    : undefined,
              }),
              set: async (payload) => {
                cursorState.lastCodeId = payload.lastCodeId;
                cursorState.writes.push(payload);
              },
            };
          },
        };
      }

      if (name === "sessionCodes") {
        return {
          orderBy: () => ({
            limit: (limit) => ({
              startAfter: (startAfterId) => ({
                get: async () => {
                  const page = codesByPage.after?.[startAfterId] ?? [];
                  return { docs: page.slice(0, limit), empty: page.length === 0 };
                },
              }),
              get: async () => {
                const page = codesByPage.first ?? [];
                return { docs: page.slice(0, limit), empty: page.length === 0 };
              },
            }),
          }),
        };
      }

      if (name === "sessions") {
        return {
          doc: (id) => ({
            get: async () => ({
              exists: Object.hasOwn(sessions, id),
              data: () => sessions[id],
            }),
          }),
        };
      }

      throw new Error(`unexpected collection ${name}`);
    },
  };
}

test("sweepOrphanSessionCodes deletes orphans only", async () => {
  const deleted = [];
  const cursorState = { lastCodeId: null, writes: [] };
  const sessions = {
    live: { status: "active" },
    dead: { status: "ended" },
  };
  const codes = [
    makeCodeDoc("DEAD", "dead"),
    makeCodeDoc("LIVE", "live"),
    makeCodeDoc("ORPH", "missing"),
  ];
  for (const code of codes) {
    code.ref.delete = async () => deleted.push(code.id);
  }

  const db = buildSweepDb({
    codesByPage: { first: codes },
    sessions,
    deleted,
    cursorState,
  });

  const orphansDeleted = await sweepOrphanSessionCodes(db, { limit: 100 });
  assert.equal(orphansDeleted, 2);
  assert.deepEqual(deleted.sort(), ["DEAD", "ORPH"]);
  assert.equal(cursorState.lastCodeId, null);
});

test("sweepOrphanSessionCodes advances cursor past a full live first page", async () => {
  const deleted = [];
  const cursorState = { lastCodeId: null, writes: [] };
  const sessions = {
    live1: { status: "active" },
    live2: { status: "active" },
    dead: { status: "ended" },
  };

  const firstPage = [makeCodeDoc("AAA", "live1"), makeCodeDoc("BBB", "live2")];
  const secondPage = [makeCodeDoc("CCC", "dead")];
  for (const code of [...firstPage, ...secondPage]) {
    code.ref.delete = async () => deleted.push(code.id);
  }

  const db = buildSweepDb({
    codesByPage: {
      first: firstPage,
      after: { BBB: secondPage },
    },
    sessions,
    deleted,
    cursorState,
  });

  const firstRun = await sweepOrphanSessionCodes(db, { limit: 2 });
  assert.equal(firstRun, 0);
  assert.equal(deleted.length, 0);
  assert.equal(cursorState.lastCodeId, "BBB");

  const secondRun = await sweepOrphanSessionCodes(db, { limit: 2 });
  assert.equal(secondRun, 1);
  assert.deepEqual(deleted, ["CCC"]);
});
