import assert from "node:assert/strict";
import test from "node:test";
import { HttpsError } from "firebase-functions/v2/https";
import { ADMIN_EMAIL_DEFAULT } from "../admin/adminAccess.mjs";
import { mapJoinSessionWithRoleError } from "../handlers/session/shared.mjs";
import {
  CLIENT_UPDATE_REQUIRED,
  clearClientMinVersionCache,
} from "../session/clientMinVersion.mjs";
import {
  JOIN_HEAL_PROOF_INVALID,
  JOIN_HEAL_ROLE_MISMATCH,
  JOIN_NOT_GATED,
  JOIN_PASSCODE_REQUIRED,
  JOIN_SESSION_ENDED,
  JOIN_WRONG_PASSCODE,
  joinSessionWithRoleHandler,
} from "../session/joinSessionWithRole.mjs";
import { newRoleSecret } from "../session/rolePasscodes.mjs";

test.beforeEach(() => {
  clearClientMinVersionCache();
});

function buildMockDb({
  sessionData,
  secrets = {},
  writes,
  codeSessionId = "sess-1",
  clientMinVersion,
}) {
  const sessionRef = { id: codeSessionId };
  const secretsRef = { id: codeSessionId };

  return {
    collection: (name) => {
      if (name === "sessionCodes") {
        return {
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => ({ sessionId: codeSessionId }),
            }),
          }),
        };
      }
      if (name === "sessions") {
        return {
          doc: () => sessionRef,
        };
      }
      if (name === "sessionRoleSecrets") {
        return {
          doc: () => secretsRef,
        };
      }
      if (name === "ops") {
        return {
          doc: (id) => ({
            get: async () => {
              if (id !== "clientMinVersion" || clientMinVersion === undefined) {
                return { exists: false, data: () => undefined };
              }
              return {
                exists: true,
                data: () => ({ minVersion: clientMinVersion }),
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
          return {
            exists: true,
            data: () => sessionData,
          };
        },
        update: async (_ref, payload) => {
          writes.push(payload);
          Object.assign(sessionData, payload);
        },
        set: async (_ref, payload) => {
          for (const key of Object.keys(secrets)) {
            delete secrets[key];
          }
          Object.assign(secrets, payload);
        },
      };
      await fn(tx);
    },
  };
}

test("empty seeker claim returns generated role passcode", async () => {
  const writes = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host"],
    memberRoles: { host: "hider" },
    roleGates: { version: 1, leaders: { hider: "host" } },
  };
  const db = buildMockDb({ sessionData, writes });

  const result = await joinSessionWithRoleHandler(
    db,
    { uid: "seeker-1" },
    {
      code: "ABCD",
      role: "seeker",
      clientVersion: "0.2.0",
    },
  );

  assert.equal(result.sessionId, "sess-1");
  assert.equal(result.becameLeader, true);
  assert.match(result.rolePasscode, /^[A-Z]{4}$/);
  assert.equal(sessionData.memberRoles["seeker-1"], "seeker");
  assert.equal(sessionData.roleGates.leaders.seeker, "seeker-1");
});

test("second seeker with wrong code throws", async () => {
  const writes = [];
  const secret = newRoleSecret();
  const sessionData = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host", "seeker-1"],
    memberRoles: { host: "hider", "seeker-1": "seeker" },
    roleGates: { version: 1, leaders: { hider: "host", seeker: "seeker-1" } },
  };
  const db = buildMockDb({ sessionData, secrets: { seeker: secret }, writes });

  await assert.rejects(
    () =>
      joinSessionWithRoleHandler(
        db,
        { uid: "seeker-2" },
        {
          code: "ABCD",
          role: "seeker",
          rolePasscode: "WRNG",
          clientVersion: "0.2.0",
        },
      ),
    (error) => error instanceof Error && error.message === JOIN_WRONG_PASSCODE,
  );
});

test("second seeker with right code joins", async () => {
  const writes = [];
  const secret = newRoleSecret();
  const sessionData = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host", "seeker-1"],
    memberRoles: { host: "hider", "seeker-1": "seeker" },
    roleGates: { version: 1, leaders: { hider: "host", seeker: "seeker-1" } },
  };
  const db = buildMockDb({ sessionData, secrets: { seeker: secret }, writes });

  const result = await joinSessionWithRoleHandler(
    db,
    { uid: "seeker-2" },
    {
      code: "ABCD",
      role: "seeker",
      rolePasscode: secret.code,
      clientVersion: "0.2.0",
    },
  );

  assert.equal(result.sessionId, "sess-1");
  assert.equal(sessionData.memberRoles["seeker-2"], "seeker");
});

test("observer always requires passcode", async () => {
  const writes = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host"],
    memberRoles: { host: "seeker" },
    roleGates: { version: 1, leaders: { seeker: "host" } },
  };
  const db = buildMockDb({
    sessionData,
    secrets: { observer: newRoleSecret() },
    writes,
  });

  await assert.rejects(
    () =>
      joinSessionWithRoleHandler(
        db,
        { uid: "guest" },
        {
          code: "ABCD",
          role: "observer",
          clientVersion: "0.2.0",
        },
      ),
    (error) => error instanceof Error && error.message === JOIN_PASSCODE_REQUIRED,
  );
});

test("role switch vacates prior role secret with full replace", async () => {
  const writes = [];
  const seekerSecret = newRoleSecret();
  const observerSecret = newRoleSecret();
  const secrets = { seeker: seekerSecret, observer: observerSecret };
  const sessionData = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host", "switcher"],
    memberRoles: { host: "hider", switcher: "seeker" },
    roleGates: { version: 1, leaders: { hider: "host", seeker: "switcher" } },
  };
  const db = buildMockDb({ sessionData, secrets, writes });

  const result = await joinSessionWithRoleHandler(
    db,
    { uid: "switcher" },
    {
      code: "ABCD",
      role: "observer",
      rolePasscode: observerSecret.code,
      clientVersion: "0.2.0",
    },
  );

  assert.equal(result.sessionId, "sess-1");
  assert.equal(sessionData.memberRoles.switcher, "observer");
  assert.equal(sessionData.roleGates.leaders.seeker, undefined);
  assert.equal(secrets.seeker, undefined);
  assert.ok(secrets.observer);
});

test("returning member same-role heal skips passcode and remaps leader", async () => {
  const writes = [];
  const secret = newRoleSecret();
  const sessionData = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host", "old-seeker"],
    memberRoles: { host: "hider", "old-seeker": "seeker" },
    roleGates: { version: 1, leaders: { hider: "host", seeker: "old-seeker" } },
  };
  const db = buildMockDb({ sessionData, secrets: { seeker: secret }, writes });

  const result = await joinSessionWithRoleHandler(
    db,
    { uid: "new-seeker" },
    {
      code: "ABCD",
      role: "seeker",
      clientVersion: "0.2.0",
      returningMemberUid: "old-seeker",
      persistedMyUid: "old-seeker",
    },
  );

  assert.equal(result.sessionId, "sess-1");
  assert.equal(result.becameLeader, false);
  assert.equal(result.rolePasscode, undefined);
  assert.equal(sessionData.memberRoles["new-seeker"], "seeker");
  assert.equal(sessionData.memberRoles["old-seeker"], undefined);
  assert.equal(sessionData.roleGates.leaders.seeker, "new-seeker");
  assert.ok(!sessionData.memberUids.includes("old-seeker"));
  assert.ok(sessionData.memberUids.includes("new-seeker"));
});

test("global client min rejects 0.10.8 and allows 0.11.0", async () => {
  const baseSession = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.11.0",
    memberUids: ["host"],
    memberRoles: { host: "hider" },
    roleGates: { version: 1, leaders: { hider: "host" } },
  };

  await assert.rejects(
    () =>
      joinSessionWithRoleHandler(
        buildMockDb({
          sessionData: { ...baseSession },
          writes: [],
          clientMinVersion: "0.11.0",
        }),
        { uid: "seeker-old" },
        {
          code: "ABCD",
          role: "seeker",
          clientVersion: "0.10.8",
        },
      ),
    (error) => error instanceof Error && error.message === CLIENT_UPDATE_REQUIRED,
  );

  const writes = [];
  const sessionData = { ...baseSession, memberUids: ["host"], memberRoles: { host: "hider" } };
  const result = await joinSessionWithRoleHandler(
    buildMockDb({
      sessionData,
      writes,
      clientMinVersion: "0.11.0",
    }),
    { uid: "seeker-ok" },
    {
      code: "ABCD",
      role: "seeker",
      clientVersion: "0.11.0",
    },
  );
  assert.equal(result.sessionId, "sess-1");
  assert.equal(sessionData.memberRoles["seeker-ok"], "seeker");
});

test("ungated returning member heal swaps uid and keeps the role", async () => {
  const writes = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host", "old-hider"],
    memberRoles: { host: "seeker", "old-hider": "hider" },
    memberAppVersions: { host: "0.2.0", "old-hider": "0.2.0" },
  };
  const db = buildMockDb({ sessionData, writes });

  const result = await joinSessionWithRoleHandler(
    db,
    { uid: "new-hider" },
    {
      code: "ABCD",
      role: "hider",
      clientVersion: "0.2.0",
      returningMemberUid: "old-hider",
      persistedMyUid: "old-hider",
    },
  );

  assert.equal(result.sessionId, "sess-1");
  assert.equal(result.becameLeader, false);
  assert.deepEqual([...sessionData.memberUids].sort(), ["host", "new-hider"]);
  assert.equal(sessionData.memberRoles["new-hider"], "hider");
  assert.equal(sessionData.memberRoles["old-hider"], undefined);
  assert.equal(sessionData.memberRoles.host, "seeker");
  assert.equal("roleGates" in writes[0], false);
});

test("ungated first join without heal still throws JOIN_NOT_GATED", async () => {
  const writes = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host"],
    memberRoles: { host: "seeker" },
  };
  const db = buildMockDb({ sessionData, writes });

  await assert.rejects(
    joinSessionWithRoleHandler(
      db,
      { uid: "guest" },
      { code: "ABCD", role: "hider", clientVersion: "0.2.0" },
    ),
    (error) => error.message === JOIN_NOT_GATED,
  );
  assert.equal(writes.length, 0);
});

function healInput(role, returningMemberUid) {
  return {
    code: "ABCD",
    role,
    clientVersion: "0.2.0",
    returningMemberUid,
    persistedMyUid: returningMemberUid,
  };
}

test("ungated heal from a non-member uid throws JOIN_NOT_GATED without writes", async () => {
  const writes = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host"],
    memberRoles: { host: "seeker" },
  };
  const db = buildMockDb({ sessionData, writes });

  await assert.rejects(
    joinSessionWithRoleHandler(db, { uid: "guest" }, healInput("hider", "ghost")),
    (error) => error.message === JOIN_NOT_GATED,
  );
  assert.equal(writes.length, 0);
});

test("ungated heal with a different role than the old seat is rejected", async () => {
  const writes = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host", "old-hider"],
    memberRoles: { host: "seeker", "old-hider": "hider" },
  };
  const db = buildMockDb({ sessionData, writes });

  await assert.rejects(
    joinSessionWithRoleHandler(db, { uid: "new-uid" }, healInput("seeker", "old-hider")),
    (error) => error.message === JOIN_HEAL_ROLE_MISMATCH,
  );
  assert.equal(writes.length, 0);
  assert.deepEqual(sessionData.memberUids, ["host", "old-hider"]);
});

test("gated heal with a different role than the old seat is rejected", async () => {
  const writes = [];
  const seekerSecret = newRoleSecret();
  const secrets = { seeker: seekerSecret };
  const sessionData = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host", "old-seeker"],
    memberRoles: { host: "hider", "old-seeker": "seeker" },
    roleGates: { version: 1, leaders: { hider: "host", seeker: "old-seeker" } },
  };
  const db = buildMockDb({ sessionData, secrets, writes });

  await assert.rejects(
    joinSessionWithRoleHandler(db, { uid: "new-uid" }, healInput("hider", "old-seeker")),
    (error) => error.message === JOIN_HEAL_ROLE_MISMATCH,
  );
  assert.equal(writes.length, 0);
  assert.deepEqual(secrets, { seeker: seekerSecret });
});

test("gated heal from a non-member uid is a normal join under passcode rules", async () => {
  const writes = [];
  const seekerSecret = newRoleSecret();
  const sessionData = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host", "seeker-1"],
    memberRoles: { host: "hider", "seeker-1": "seeker" },
    roleGates: { version: 1, leaders: { hider: "host", seeker: "seeker-1" } },
  };
  const db = buildMockDb({ sessionData, secrets: { seeker: seekerSecret }, writes });

  await assert.rejects(
    joinSessionWithRoleHandler(db, { uid: "guest" }, healInput("seeker", "ghost")),
    (error) => error.message === JOIN_PASSCODE_REQUIRED,
  );
  assert.equal(writes.length, 0);
});

test("ungated heal of the host seat moves hostUid to the healed uid", async () => {
  const writes = [];
  const sessionData = {
    status: "active",
    hostUid: "old-host",
    hostAppVersion: "0.1.0",
    memberUids: ["old-host", "aaa-seeker"],
    memberRoles: { "old-host": "hider", "aaa-seeker": "seeker" },
  };
  const db = buildMockDb({ sessionData, writes });

  const result = await joinSessionWithRoleHandler(
    db,
    { uid: "new-host" },
    healInput("hider", "old-host"),
  );

  assert.equal(result.sessionId, "sess-1");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].hostUid, "new-host");
  assert.equal(sessionData.hostUid, "new-host");
  assert.deepEqual([...sessionData.memberUids].sort(), ["aaa-seeker", "new-host"]);
  assert.equal(sessionData.memberRoles["new-host"], "hider");
});

test("gated heal of the host seat moves hostUid to the healed uid", async () => {
  const writes = [];
  const sessionData = {
    status: "active",
    hostUid: "old-host",
    hostAppVersion: "0.1.0",
    memberUids: ["old-host", "aaa-seeker"],
    memberRoles: { "old-host": "hider", "aaa-seeker": "seeker" },
    roleGates: { version: 1, leaders: { hider: "old-host", seeker: "aaa-seeker" } },
  };
  const db = buildMockDb({ sessionData, secrets: { hider: newRoleSecret() }, writes });

  await joinSessionWithRoleHandler(db, { uid: "new-host" }, healInput("hider", "old-host"));

  assert.equal(writes.length, 1);
  assert.equal(writes[0].hostUid, "new-host");
  assert.equal(sessionData.hostUid, "new-host");
  assert.equal(sessionData.roleGates.leaders.hider, "new-host");
});

test("heal of a non-host seat does not write hostUid", async () => {
  const writes = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host", "old-hider"],
    memberRoles: { host: "seeker", "old-hider": "hider" },
  };
  const db = buildMockDb({ sessionData, writes });

  await joinSessionWithRoleHandler(db, { uid: "new-hider" }, healInput("hider", "old-hider"));

  assert.equal("hostUid" in writes[0], false);
  assert.equal(sessionData.hostUid, "host");
});

test("ungated heal of an old uid without a stored role defaults to seeker", async () => {
  const sessionData = () => ({
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host", "old-uid"],
    memberRoles: { host: "hider" },
  });

  const seekerWrites = [];
  const seekerSession = sessionData();
  await joinSessionWithRoleHandler(
    buildMockDb({ sessionData: seekerSession, writes: seekerWrites }),
    { uid: "new-uid" },
    healInput("seeker", "old-uid"),
  );
  assert.equal(seekerSession.memberRoles["new-uid"], "seeker");
  assert.ok(!seekerSession.memberUids.includes("old-uid"));

  const hiderWrites = [];
  const hiderSession = sessionData();
  await assert.rejects(
    joinSessionWithRoleHandler(
      buildMockDb({ sessionData: hiderSession, writes: hiderWrites }),
      { uid: "new-uid" },
      healInput("hider", "old-uid"),
    ),
    (error) => error.message === JOIN_HEAL_ROLE_MISMATCH,
  );
  assert.equal(hiderWrites.length, 0);
});

test("gated heal of an old uid without a stored role reclaims seeker without a passcode", async () => {
  const writes = [];
  const seekerSecret = newRoleSecret();
  const secrets = { seeker: seekerSecret };
  const sessionData = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host", "seeker-1", "old-uid"],
    memberRoles: { host: "hider", "seeker-1": "seeker" },
    roleGates: { version: 1, leaders: { hider: "host", seeker: "seeker-1" } },
  };
  const db = buildMockDb({ sessionData, secrets, writes });

  const result = await joinSessionWithRoleHandler(
    db,
    { uid: "new-uid" },
    healInput("seeker", "old-uid"),
  );

  assert.equal(result.becameLeader, false);
  assert.equal(result.rolePasscode, undefined);
  assert.equal(sessionData.memberRoles["new-uid"], "seeker");
  assert.equal(sessionData.roleGates.leaders.seeker, "seeker-1");
  assert.deepEqual(secrets, { seeker: seekerSecret });
});

test("admin heal into a seeker seat with role admin is rejected without writes", async () => {
  const writes = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host", "old-seeker"],
    memberRoles: { host: "hider", "old-seeker": "seeker" },
    roleGates: { version: 1, leaders: { hider: "host", seeker: "old-seeker" } },
  };
  const db = buildMockDb({ sessionData, secrets: { seeker: newRoleSecret() }, writes });
  const adminAuth = {
    uid: "new-admin",
    token: { email: ADMIN_EMAIL_DEFAULT, email_verified: true },
  };

  await assert.rejects(
    joinSessionWithRoleHandler(db, adminAuth, healInput("admin", "old-seeker")),
    (error) => error.message === JOIN_HEAL_ROLE_MISMATCH,
  );
  assert.equal(writes.length, 0);
  assert.deepEqual(sessionData.memberUids, ["host", "old-seeker"]);
});

test("ended ungated session rejects a heal with JOIN_SESSION_ENDED", async () => {
  const writes = [];
  const sessionData = {
    status: "ended",
    hostUid: "host",
    hostAppVersion: "0.1.0",
    memberUids: ["host", "old-hider"],
    memberRoles: { host: "seeker", "old-hider": "hider" },
  };
  const db = buildMockDb({ sessionData, writes });

  await assert.rejects(
    joinSessionWithRoleHandler(db, { uid: "new-uid" }, healInput("hider", "old-hider")),
    (error) => error.message === JOIN_SESSION_ENDED,
  );
  assert.equal(writes.length, 0);
});

test("heal role mismatch maps to a failed-precondition HttpsError", () => {
  assert.throws(
    () => mapJoinSessionWithRoleError(new Error(JOIN_HEAL_ROLE_MISMATCH)),
    (error) =>
      error instanceof HttpsError &&
      error.code === "failed-precondition" &&
      error.message === "Rejoin in your previous role.",
  );
});

test("heal proof rejection maps to a failed-precondition HttpsError", () => {
  assert.throws(
    () => mapJoinSessionWithRoleError(new Error(JOIN_HEAL_PROOF_INVALID)),
    (error) =>
      error instanceof HttpsError &&
      error.code === "failed-precondition" &&
      error.message === "Heal proof invalid.",
  );
});
