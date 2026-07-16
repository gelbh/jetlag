import test from "node:test";
import assert from "node:assert/strict";
import {
  CLAIM_USERNAME_ALREADY_SET,
  CLAIM_USERNAME_INVALID,
  CLAIM_USERNAME_TAKEN,
  claimUsernameHandler,
  validateUsername,
} from "../profile/claimUsername.mjs";

function createMockDb({ usernameDoc = null, profileDoc = null } = {}) {
  const writes = [];
  const state = {
    usernameDoc: usernameDoc ? { ...usernameDoc } : null,
    profileDoc: profileDoc ? { ...profileDoc } : null,
  };

  function docRef(kind, id) {
    return { kind, id };
  }

  return {
    writes,
    state,
    collection(name) {
      if (name === "usernames") {
        return {
          doc(id) {
            return docRef("username", id);
          },
        };
      }
      if (name === "users") {
        return {
          doc(uid) {
            return {
              collection(sub) {
                assert.equal(sub, "profile");
                return {
                  doc(docId) {
                    assert.equal(docId, "main");
                    return docRef("profile", uid);
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    async runTransaction(callback) {
      await callback({
        async get(ref) {
          if (ref.kind === "username") {
            return {
              exists: state.usernameDoc != null,
              data: () => state.usernameDoc,
            };
          }
          return {
            exists: state.profileDoc != null,
            data: () => state.profileDoc,
          };
        },
        set(ref, payload) {
          writes.push({ ref, payload });
          if (ref.kind === "username") {
            state.usernameDoc = payload;
          } else {
            state.profileDoc = payload;
          }
        },
      });
    },
  };
}

test("validateUsername rejects reserved and short", () => {
  assert.equal(validateUsername("ab").ok, false);
  assert.equal(validateUsername("admin").ok, false);
  assert.equal(validateUsername("ok_1").ok, true);
});

test("claimUsernameHandler writes username and profile", async () => {
  const db = createMockDb();
  const result = await claimUsernameHandler(db, "uid-1", "Seeker_1");
  assert.deepEqual(result, { username: "Seeker_1" });
  assert.equal(db.writes.length, 2);
  assert.equal(db.state.usernameDoc.uid, "uid-1");
  assert.equal(db.state.profileDoc.username, "Seeker_1");
  assert.equal(db.state.profileDoc.displayName, "Seeker_1");
  assert.equal(db.state.profileDoc.leaderboardOptIn, false);
});

test("claimUsernameHandler rejects taken username", async () => {
  const db = createMockDb({
    usernameDoc: { uid: "other", username: "taken" },
  });
  await assert.rejects(
    () => claimUsernameHandler(db, "uid-1", "taken"),
    (error) => error.message === CLAIM_USERNAME_TAKEN,
  );
});

test("claimUsernameHandler rejects when already set", async () => {
  const db = createMockDb({
    profileDoc: { username: "existing", leaderboardOptIn: true },
  });
  await assert.rejects(
    () => claimUsernameHandler(db, "uid-1", "newname"),
    (error) => error.message === CLAIM_USERNAME_ALREADY_SET,
  );
});

test("claimUsernameHandler rejects invalid", async () => {
  const db = createMockDb();
  await assert.rejects(
    () => claimUsernameHandler(db, "uid-1", "no spaces"),
    (error) => error.message === CLAIM_USERNAME_INVALID,
  );
});
