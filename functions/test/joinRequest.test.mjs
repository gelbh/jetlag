import test from "node:test";
import assert from "node:assert/strict";
import {
  JOIN_REQ_EXPIRED,
  JOIN_REQ_NOT_AUTHORIZED,
  JOIN_REQ_SIDE_EMPTY,
  JOIN_REQUEST_TTL_MS,
  cancelRoleJoinRequestHandler,
  requestRoleJoinHandler,
  resolveRoleJoinRequestHandler,
} from "../session/joinRequest.mjs";

function createDocRef(id) {
  return { id, path: id };
}

function buildMockDb({
  sessionData,
  secrets = {},
  profiles = {},
  requests = {},
}) {
  const sessionRef = createDocRef("sess-1");
  const secretsRef = createDocRef("sess-1-secrets");
  let nextRequestSeq = 1;
  const store = { ...requests };

  function requestRefFor(id) {
    return createDocRef(`joinRequests/${id}`);
  }

  return {
    _store: store,
    _sessionData: sessionData,
    _secrets: secrets,
    collection: (name) => {
      if (name === "sessions") {
        return {
          doc: (sessionId = "sess-1") => ({
            id: sessionId,
            get: async () => ({
              exists: sessionData != null,
              data: () => sessionData,
            }),
            collection: (sub) => {
              if (sub !== "joinRequests") {
                throw new Error(`unexpected subcollection ${sub}`);
              }
              return {
                doc: (id) => {
                  const requestId = id ?? `req-${nextRequestSeq++}`;
                  const ref = requestRefFor(requestId);
                  ref.id = requestId;
                  ref.set = async (payload) => {
                    store[requestId] = { ...payload };
                  };
                  ref.get = async () => ({
                    exists: store[requestId] != null,
                    data: () => store[requestId],
                  });
                  return ref;
                },
              };
            },
          }),
        };
      }
      if (name === "sessionRoleSecrets") {
        return {
          doc: () => secretsRef,
        };
      }
      if (name === "users") {
        return {
          doc: (uid) => ({
            collection: (sub) => {
              if (sub !== "profile") {
                throw new Error(`unexpected ${sub}`);
              }
              return {
                doc: () => ({
                  get: async () => ({
                    exists: profiles[uid] != null,
                    data: () => profiles[uid],
                  }),
                }),
              };
            },
          }),
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    runTransaction: async (fn) => {
      const tx = {
        get: async (ref) => {
          if (ref === secretsRef) {
            return {
              exists: Object.keys(secrets).length > 0,
              data: () => secrets,
            };
          }
          if (ref === sessionRef || ref.id === "sess-1") {
            return {
              exists: sessionData != null,
              data: () => sessionData,
            };
          }
          if (typeof ref.id === "string" && ref.id.startsWith("req-")) {
            return {
              exists: store[ref.id] != null,
              data: () => store[ref.id],
            };
          }
          if (
            typeof ref.path === "string" &&
            ref.path.startsWith("joinRequests/")
          ) {
            const id = ref.id;
            return {
              exists: store[id] != null,
              data: () => store[id],
            };
          }
          return {
            exists: sessionData != null,
            data: () => sessionData,
          };
        },
        update: async (ref, payload) => {
          if (ref === sessionRef || ref.id === "sess-1") {
            Object.assign(sessionData, payload);
            return;
          }
          const id = ref.id;
          if (store[id]) {
            Object.assign(store[id], payload);
          }
        },
        set: async (ref, payload) => {
          if (ref === secretsRef) {
            for (const key of Object.keys(secrets)) {
              delete secrets[key];
            }
            Object.assign(secrets, payload);
            return;
          }
          store[ref.id] = { ...payload };
        },
      };
      await fn(tx);
    },
  };
}

function occupiedSeekerSession() {
  return {
    status: "active",
    hostUid: "host",
    memberUids: ["host", "seeker-1"],
    memberRoles: { host: "hider", "seeker-1": "seeker" },
    memberAppVersions: { host: "0.1.0", "seeker-1": "0.1.0" },
    roleGates: { version: 1, leaders: { hider: "host", seeker: "seeker-1" } },
  };
}

test("requestRoleJoin creates pending with 10m expiry", async () => {
  const sessionData = occupiedSeekerSession();
  const db = buildMockDb({
    sessionData,
    profiles: { guest: { username: "ada" } },
  });
  const createdMs = Date.parse("2026-08-03T12:00:00.000Z");

  const result = await requestRoleJoinHandler(
    db,
    { uid: "guest" },
    { getUser: async () => ({ email: "ignored@x.com" }) },
    { sessionId: "sess-1", role: "seeker", clientVersion: "0.2.0" },
    createdMs,
  );

  assert.equal(typeof result.requestId, "string");
  assert.equal(
    result.expiresAt,
    new Date(createdMs + JOIN_REQUEST_TTL_MS).toISOString(),
  );
  const stored = db._store[result.requestId];
  assert.equal(stored.status, "pending");
  assert.equal(stored.identityLabel, "ada");
  assert.equal(stored.role, "seeker");
  assert.equal(stored.requesterUid, "guest");
});

test("requestRoleJoin rejects empty seeker side", async () => {
  const sessionData = {
    status: "active",
    hostUid: "host",
    memberUids: ["host"],
    memberRoles: { host: "hider" },
    roleGates: { version: 1, leaders: { hider: "host" } },
  };
  const db = buildMockDb({ sessionData });

  await assert.rejects(
    () =>
      requestRoleJoinHandler(
        db,
        { uid: "guest" },
        null,
        { sessionId: "sess-1", role: "seeker" },
      ),
    (error) => error instanceof Error && error.message === JOIN_REQ_SIDE_EMPTY,
  );
});

test("cancelRoleJoinRequest cancels by requester", async () => {
  const sessionData = occupiedSeekerSession();
  const db = buildMockDb({
    sessionData,
    requests: {
      "req-1": {
        requesterUid: "guest",
        role: "seeker",
        status: "pending",
        identityLabel: "guest@x.com",
        createdAt: "2026-08-03T12:00:00.000Z",
        expiresAt: "2026-08-03T12:10:00.000Z",
      },
    },
  });

  const result = await cancelRoleJoinRequestHandler(
    db,
    { uid: "guest" },
    { sessionId: "sess-1", requestId: "req-1" },
    Date.parse("2026-08-03T12:05:00.000Z"),
  );

  assert.deepEqual(result, { ok: true });
  assert.equal(db._store["req-1"].status, "cancelled");
  assert.equal(db._store["req-1"].resolvedByUid, "guest");
});

test("resolveRoleJoinRequest accept by leader adds memberRoles", async () => {
  const sessionData = occupiedSeekerSession();
  const db = buildMockDb({
    sessionData,
    requests: {
      "req-1": {
        requesterUid: "guest",
        role: "seeker",
        status: "pending",
        identityLabel: "ada",
        createdAt: "2026-08-03T12:00:00.000Z",
        expiresAt: "2026-08-03T12:10:00.000Z",
        clientVersion: "0.2.0",
      },
    },
  });

  const result = await resolveRoleJoinRequestHandler(
    db,
    { uid: "seeker-1" },
    { sessionId: "sess-1", requestId: "req-1", decision: "accept" },
    Date.parse("2026-08-03T12:05:00.000Z"),
  );

  assert.deepEqual(result, { ok: true });
  assert.equal(sessionData.memberRoles.guest, "seeker");
  assert.ok(sessionData.memberUids.includes("guest"));
  assert.equal(db._store["req-1"].status, "accepted");
  assert.equal(db._store["req-1"].resolvedByUid, "seeker-1");
});

test("resolveRoleJoinRequest decline by non-leader fails", async () => {
  const sessionData = occupiedSeekerSession();
  const db = buildMockDb({
    sessionData,
    requests: {
      "req-1": {
        requesterUid: "guest",
        role: "seeker",
        status: "pending",
        identityLabel: "ada",
        createdAt: "2026-08-03T12:00:00.000Z",
        expiresAt: "2026-08-03T12:10:00.000Z",
      },
    },
  });

  await assert.rejects(
    () =>
      resolveRoleJoinRequestHandler(
        db,
        { uid: "host" },
        { sessionId: "sess-1", requestId: "req-1", decision: "decline" },
        Date.parse("2026-08-03T12:05:00.000Z"),
      ),
    (error) =>
      error instanceof Error && error.message === JOIN_REQ_NOT_AUTHORIZED,
  );
});

test("resolveRoleJoinRequest expired pending cannot accept", async () => {
  const sessionData = occupiedSeekerSession();
  const db = buildMockDb({
    sessionData,
    requests: {
      "req-1": {
        requesterUid: "guest",
        role: "seeker",
        status: "pending",
        identityLabel: "ada",
        createdAt: "2026-08-03T12:00:00.000Z",
        expiresAt: "2026-08-03T12:10:00.000Z",
      },
    },
  });

  await assert.rejects(
    () =>
      resolveRoleJoinRequestHandler(
        db,
        { uid: "seeker-1" },
        { sessionId: "sess-1", requestId: "req-1", decision: "accept" },
        Date.parse("2026-08-03T12:10:01.000Z"),
      ),
    (error) => error instanceof Error && error.message === JOIN_REQ_EXPIRED,
  );

  assert.equal(db._store["req-1"].status, "expired");
  assert.equal(sessionData.memberRoles.guest, undefined);
});

test("cancelRoleJoinRequest expired commits status before rejecting", async () => {
  const sessionData = occupiedSeekerSession();
  const db = buildMockDb({
    sessionData,
    requests: {
      "req-1": {
        requesterUid: "guest",
        role: "seeker",
        status: "pending",
        identityLabel: "ada",
        createdAt: "2026-08-03T12:00:00.000Z",
        expiresAt: "2026-08-03T12:10:00.000Z",
      },
    },
  });

  await assert.rejects(
    () =>
      cancelRoleJoinRequestHandler(
        db,
        { uid: "guest" },
        { sessionId: "sess-1", requestId: "req-1" },
        Date.parse("2026-08-03T12:10:01.000Z"),
      ),
    (error) => error instanceof Error && error.message === JOIN_REQ_EXPIRED,
  );

  assert.equal(db._store["req-1"].status, "expired");
  assert.ok(db._store["req-1"].resolvedAt);
});
