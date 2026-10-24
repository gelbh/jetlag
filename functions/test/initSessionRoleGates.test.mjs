import assert from "node:assert/strict";
import test from "node:test";
import { HttpsError } from "firebase-functions/v2/https";
import {
  INIT_ALREADY_INITIALIZED,
  INIT_NOT_HOST,
  initSessionRoleGatesHandler,
} from "../session/initSessionRoleGates.mjs";

function buildMockDb({ sessionData, secretsExists = false }) {
  const sessionRef = { id: "sess-1", path: "sessions/sess-1" };
  const secretsRef = { id: "sess-1", path: "sessionRoleSecrets/sess-1" };
  let roleGatesWritten = null;
  let secretsWritten = null;

  return {
    get roleGatesWritten() {
      return roleGatesWritten;
    },
    get secretsWritten() {
      return secretsWritten;
    },
    collection: (name) => {
      if (name === "sessions") {
        return { doc: () => sessionRef };
      }
      if (name === "sessionRoleSecrets") {
        return { doc: () => secretsRef };
      }
      throw new Error(`unexpected ${name}`);
    },
    runTransaction: async (fn) => {
      const tx = {
        get: async (ref) => {
          if (ref === secretsRef) {
            return {
              exists: secretsExists,
              data: () => ({}),
            };
          }
          return {
            exists: true,
            data: () => sessionData,
          };
        },
        update: (_ref, payload) => {
          roleGatesWritten = payload.roleGates;
        },
        set: (_ref, payload) => {
          secretsWritten = payload;
        },
      };
      await fn(tx);
    },
  };
}

test("classic seeker host initializes role gates and secrets", async () => {
  const sessionData = {
    hostUid: "host-1",
    memberRoles: { "host-1": "seeker" },
  };
  const db = buildMockDb({ sessionData });

  const result = await initSessionRoleGatesHandler(db, "host-1", "sess-1");

  assert.equal(typeof result.observerPasscode, "string");
  assert.equal(typeof result.rolePasscode, "string");
  assert.deepEqual(db.roleGatesWritten, {
    version: 1,
    leaders: { seeker: "host-1" },
  });
  assert.ok(db.secretsWritten?.observer?.code);
  assert.ok(db.secretsWritten?.seeker?.code);
});

test("classic observer host is rejected", async () => {
  const sessionData = {
    hostUid: "host-1",
    memberRoles: { "host-1": "observer" },
  };
  const db = buildMockDb({ sessionData });

  await assert.rejects(
    () => initSessionRoleGatesHandler(db, "host-1", "sess-1"),
    (error) =>
      error instanceof HttpsError &&
      error.code === "failed-precondition" &&
      error.message === "Host player role must be seeker or hider.",
  );
});

test("castleSiege observer host initializes observer-only secrets", async () => {
  const sessionData = {
    hostUid: "host-1",
    mode: "castleSiege",
    memberRoles: { "host-1": "observer" },
    castleSiegeRoles: { "host-1": "teamA" },
  };
  const db = buildMockDb({ sessionData });

  const result = await initSessionRoleGatesHandler(db, "host-1", "sess-1");

  assert.equal(typeof result.observerPasscode, "string");
  // hostRole is observer → rolePasscode is the observer secret (no seeker/hider mint).
  assert.equal(result.rolePasscode, result.observerPasscode);
  assert.deepEqual(db.roleGatesWritten, { version: 1, leaders: {} });
  assert.ok(db.secretsWritten?.observer?.code);
  assert.equal(db.secretsWritten?.seeker, undefined);
  assert.equal(db.secretsWritten?.hider, undefined);
});

test("non-host cannot initialize", async () => {
  const sessionData = {
    hostUid: "host-1",
    memberRoles: { "host-1": "seeker" },
  };
  const db = buildMockDb({ sessionData });

  await assert.rejects(
    () => initSessionRoleGatesHandler(db, "other", "sess-1"),
    (error) => error instanceof Error && error.message === INIT_NOT_HOST,
  );
});

test("already initialized secrets are rejected", async () => {
  const sessionData = {
    hostUid: "host-1",
    memberRoles: { "host-1": "seeker" },
  };
  const db = buildMockDb({ sessionData, secretsExists: true });

  await assert.rejects(
    () => initSessionRoleGatesHandler(db, "host-1", "sess-1"),
    (error) => error instanceof Error && error.message === INIT_ALREADY_INITIALIZED,
  );
});
