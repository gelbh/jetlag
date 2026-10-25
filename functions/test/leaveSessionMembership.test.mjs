import assert from "node:assert/strict";
import test from "node:test";
import { leaveSessionMembershipHandler } from "../session/leaveSessionMembership.mjs";
import { newRoleSecret } from "../session/rolePasscodes.mjs";

function buildMockDb({ sessionData, secrets, writes, secretWrites }) {
  const sessionRef = { id: "sess-1" };
  const secretsRef = { id: "sess-1" };
  let wrote = false;

  return {
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
          if (wrote) {
            throw new Error("Firestore read-after-write in transaction");
          }
          if (ref === secretsRef) {
            return {
              exists: secrets != null,
              data: () => secrets,
            };
          }
          return {
            exists: true,
            data: () => sessionData,
          };
        },
        update: async (_ref, payload) => {
          wrote = true;
          writes.push(payload);
          Object.assign(sessionData, payload);
        },
        set: async (_ref, payload) => {
          wrote = true;
          secretWrites.push(payload);
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

test("leave promotes lexicographic next role leader", async () => {
  const writes = [];
  const secretWrites = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    memberUids: ["host", "leader", "b", "a"],
    memberRoles: {
      host: "hider",
      leader: "seeker",
      a: "seeker",
      b: "seeker",
    },
    roleGates: {
      version: 1,
      leaders: { hider: "host", seeker: "leader" },
    },
  };
  const secrets = { seeker: newRoleSecret() };
  const db = buildMockDb({ sessionData, secrets, writes, secretWrites });

  await leaveSessionMembershipHandler(db, "leader", "sess-1");

  assert.deepEqual(sessionData.memberUids, ["host", "b", "a"]);
  assert.equal(sessionData.roleGates.leaders.seeker, "a");
  assert.ok(secrets.seeker);
});

test("leave last role member clears secret without read-after-write", async () => {
  const writes = [];
  const secretWrites = [];
  const sessionData = {
    status: "active",
    hostUid: "host",
    memberUids: ["host", "solo-hider"],
    memberRoles: { host: "seeker", "solo-hider": "hider" },
    roleGates: {
      version: 1,
      leaders: { seeker: "host", hider: "solo-hider" },
    },
  };
  const secrets = { hider: newRoleSecret(), observer: newRoleSecret() };
  const db = buildMockDb({ sessionData, secrets, writes, secretWrites });

  await leaveSessionMembershipHandler(db, "solo-hider", "sess-1");

  assert.equal(sessionData.roleGates.leaders.hider, undefined);
  assert.equal(secrets.hider, undefined);
  assert.ok(secrets.observer);
  assert.equal(secretWrites.length, 1);
});

test("castleSiege leave promotes lexicographic next teamA leader", async () => {
  const writes = [];
  const secretWrites = [];
  const sessionData = {
    status: "active",
    mode: "castleSiege",
    hostUid: "host",
    memberUids: ["host", "leader", "b", "a"],
    memberRoles: {
      host: "observer",
      leader: "observer",
      a: "observer",
      b: "observer",
    },
    castleSiegeRoles: {
      host: "teamB",
      leader: "teamA",
      a: "teamA",
      b: "teamA",
    },
    roleGates: {
      version: 1,
      leaders: { teamA: "leader", teamB: "host" },
    },
  };
  const secrets = { teamA: newRoleSecret(), teamB: newRoleSecret() };
  const db = buildMockDb({ sessionData, secrets, writes, secretWrites });

  await leaveSessionMembershipHandler(db, "leader", "sess-1");

  assert.deepEqual(sessionData.memberUids, ["host", "b", "a"]);
  assert.equal(sessionData.roleGates.leaders.teamA, "a");
  assert.ok(secrets.teamA);
  assert.equal(sessionData.castleSiegeRoles.leader, undefined);
});

test("castleSiege leave last teamA member clears team secret", async () => {
  const writes = [];
  const secretWrites = [];
  const sessionData = {
    status: "active",
    mode: "castleSiege",
    hostUid: "host",
    memberUids: ["host", "solo-a"],
    memberRoles: { host: "observer", "solo-a": "observer" },
    castleSiegeRoles: { host: "teamB", "solo-a": "teamA" },
    roleGates: {
      version: 1,
      leaders: { teamA: "solo-a", teamB: "host" },
    },
  };
  const secrets = { teamA: newRoleSecret(), teamB: newRoleSecret(), observer: newRoleSecret() };
  const db = buildMockDb({ sessionData, secrets, writes, secretWrites });

  await leaveSessionMembershipHandler(db, "solo-a", "sess-1");

  assert.equal(sessionData.roleGates.leaders.teamA, undefined);
  assert.equal(secrets.teamA, undefined);
  assert.ok(secrets.teamB);
  assert.ok(secrets.observer);
  assert.equal(secretWrites.length, 1);
});
