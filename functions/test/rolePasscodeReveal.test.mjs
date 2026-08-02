import test from "node:test";
import assert from "node:assert/strict";
import {
  REVEAL_NOT_AUTHORIZED,
  regenerateRolePasscodeHandler,
  revealRolePasscodeHandler,
} from "../session/rolePasscodeReveal.mjs";
import { newRoleSecret } from "../session/rolePasscodes.mjs";

function buildMockDb({ sessionData, secrets }) {
  const sessionRef = { id: "sess-1" };
  const secretsRef = { id: "sess-1" };
  let liveSecrets = { ...secrets };

  return {
    collection: (name) => {
      if (name === "sessions") {
        return {
          doc: () => ({
            get: async () => ({
              exists: true,
              data: () => sessionData,
            }),
          }),
        };
      }
      if (name === "sessionRoleSecrets") {
        return {
          doc: () => secretsRef,
        };
      }
      throw new Error(`unexpected ${name}`);
    },
    runTransaction: async (fn) => {
      const tx = {
        get: async (ref) => {
          if (ref === secretsRef) {
            return {
              exists: Object.keys(liveSecrets).length > 0,
              data: () => liveSecrets,
            };
          }
          return {
            exists: true,
            data: () => sessionData,
          };
        },
        set: async (_ref, payload) => {
          liveSecrets = { ...liveSecrets, ...payload };
        },
      };
      await fn(tx);
      secrets.value = liveSecrets;
    },
    _secrets: { value: liveSecrets },
  };
}

test("reveal denied for non-leader", async () => {
  const secret = newRoleSecret();
  const sessionData = {
    hostUid: "host",
    memberRoles: { host: "hider", guest: "seeker" },
    roleGates: { version: 1, leaders: { seeker: "guest", hider: "host" } },
  };
  const db = buildMockDb({ sessionData, secrets: { seeker: secret } });

  await assert.rejects(
    () => revealRolePasscodeHandler(db, "other", "sess-1", "seeker"),
    (error) => error instanceof Error && error.message === REVEAL_NOT_AUTHORIZED,
  );
});

test("regenerate rotates verify code for leader", async () => {
  const secret = newRoleSecret();
  const sessionData = {
    hostUid: "host",
    memberRoles: { host: "hider", leader: "seeker" },
    roleGates: { version: 1, leaders: { seeker: "leader", hider: "host" } },
  };
  const secrets = { seeker: secret };
  const db = buildMockDb({ sessionData, secrets });

  const result = await regenerateRolePasscodeHandler(db, "leader", "sess-1", "seeker");

  assert.notEqual(result.rolePasscode, secret.code);
  assert.match(result.rolePasscode, /^[A-Z]{4}$/);
});
