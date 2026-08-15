import test from "node:test";
import assert from "node:assert/strict";
import {
  JOIN_PASSCODE_REQUIRED,
  JOIN_WRONG_PASSCODE,
  joinSessionWithRoleHandler,
} from "../session/joinSessionWithRole.mjs";
import { CLIENT_UPDATE_REQUIRED } from "../session/clientMinVersion.mjs";
import { clearClientMinVersionCache } from "../session/clientMinVersion.mjs";
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

  const result = await joinSessionWithRoleHandler(db, { uid: "seeker-1" }, {
    code: "ABCD",
    role: "seeker",
    clientVersion: "0.2.0",
  });

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
      joinSessionWithRoleHandler(db, { uid: "seeker-2" }, {
        code: "ABCD",
        role: "seeker",
        rolePasscode: "WRNG",
        clientVersion: "0.2.0",
      }),
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

  const result = await joinSessionWithRoleHandler(db, { uid: "seeker-2" }, {
    code: "ABCD",
    role: "seeker",
    rolePasscode: secret.code,
    clientVersion: "0.2.0",
  });

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
      joinSessionWithRoleHandler(db, { uid: "guest" }, {
        code: "ABCD",
        role: "observer",
        clientVersion: "0.2.0",
      }),
    (error) =>
      error instanceof Error && error.message === JOIN_PASSCODE_REQUIRED,
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

  const result = await joinSessionWithRoleHandler(db, { uid: "switcher" }, {
    code: "ABCD",
    role: "observer",
    rolePasscode: observerSecret.code,
    clientVersion: "0.2.0",
  });

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

  const result = await joinSessionWithRoleHandler(db, { uid: "new-seeker" }, {
    code: "ABCD",
    role: "seeker",
    clientVersion: "0.2.0",
    returningMemberUid: "old-seeker",
    persistedMyUid: "old-seeker",
  });

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
    (error) =>
      error instanceof Error && error.message === CLIENT_UPDATE_REQUIRED,
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
