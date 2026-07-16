import test from "node:test";
import assert from "node:assert/strict";
import {
  FRIENDS_ALREADY,
  FRIENDS_INVALID,
  FRIENDS_SELF,
  profileFriendsHandler,
} from "../profile/profileFriends.mjs";

const auth = (uid) => ({
  uid,
  token: { firebase: { sign_in_provider: "google.com" } },
});

/**
 * Minimal Firestore stand-in for friends graph + rate-limit docs.
 * Paths are `col/doc/col/doc…` with even segment counts for documents.
 */
function createMemoryDb(seed = {}) {
  const store = new Map(Object.entries(seed));

  function docIdFromPath(path) {
    const parts = path.split("/");
    return parts[parts.length - 1];
  }

  function listChildDocs(collectionPath) {
    const prefix = `${collectionPath}/`;
    const docs = [];
    for (const [path, data] of store) {
      if (!path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      if (!rest || rest.includes("/")) continue;
      docs.push({
        id: rest,
        path,
        exists: true,
        data: () => data,
      });
    }
    return docs;
  }

  function makeQuery(collectionPath, limitCount = Infinity) {
    return {
      _collectionPath: collectionPath,
      _limit: limitCount,
      limit(n) {
        return makeQuery(collectionPath, n);
      },
      orderBy() {
        return this;
      },
      startAt() {
        return this;
      },
      endAt() {
        return this;
      },
      async get() {
        const docs = listChildDocs(collectionPath).slice(0, limitCount);
        return {
          docs,
          size: docs.length,
          empty: docs.length === 0,
        };
      },
    };
  }

  function makeDocRef(path) {
    return {
      path,
      id: docIdFromPath(path),
      collection(name) {
        return makeCollection(`${path}/${name}`);
      },
      async get() {
        if (!store.has(path)) {
          return { exists: false, id: docIdFromPath(path), data: () => undefined };
        }
        return {
          exists: true,
          id: docIdFromPath(path),
          data: () => store.get(path),
        };
      },
    };
  }

  function makeCollection(path) {
    return {
      doc(id) {
        return makeDocRef(`${path}/${id}`);
      },
      limit(n) {
        return makeQuery(path, n);
      },
      orderBy() {
        return makeQuery(path);
      },
      async get() {
        return makeQuery(path).get();
      },
    };
  }

  return {
    collection(name) {
      return makeCollection(name);
    },
    async runTransaction(fn) {
      const tx = {
        async get(target) {
          if (target && typeof target.get === "function" && target.path) {
            return target.get();
          }
          if (target && target._collectionPath) {
            return target.get();
          }
          throw new Error("Unsupported transaction get target");
        },
        set(ref, data) {
          store.set(ref.path, data);
        },
        delete(ref) {
          store.delete(ref.path);
        },
      };
      return fn(tx);
    },
    _store: store,
  };
}

function seedUser(db, uid, username) {
  db._store.set(`users/${uid}/profile/main`, { username });
}

function pendingEdges(db, fromUid, toUid, fromUsername, toUsername) {
  db._store.set(`users/${toUid}/friendRequests/${fromUid}`, {
    fromUid,
    fromUsername,
    createdAt: "t0",
  });
  db._store.set(`users/${fromUid}/outgoingFriendRequests/${toUid}`, {
    toUid,
    toUsername,
    createdAt: "t0",
  });
}

test("profileFriendsHandler rejects unknown action", async () => {
  const db = createMemoryDb();
  await assert.rejects(
    () => profileFriendsHandler(db, auth("u1"), { action: "nope" }),
    (error) => error.code === FRIENDS_INVALID,
  );
});

test("profileFriendsHandler rejects self-request", async () => {
  const db = createMemoryDb();
  seedUser(db, "u1", "me");
  await assert.rejects(
    () =>
      profileFriendsHandler(db, auth("u1"), {
        action: "request",
        toUid: "u1",
      }),
    (error) => error.code === FRIENDS_SELF,
  );
});

test("request creates pending edges for both users", async () => {
  const db = createMemoryDb();
  seedUser(db, "u1", "alice");
  seedUser(db, "u2", "bob");

  await profileFriendsHandler(db, auth("u1"), {
    action: "request",
    toUid: "u2",
  });

  assert.equal(
    db._store.get("users/u2/friendRequests/u1")?.fromUsername,
    "alice",
  );
  assert.equal(
    db._store.get("users/u1/outgoingFriendRequests/u2")?.toUsername,
    "bob",
  );
});

test("duplicate request is a no-op", async () => {
  const db = createMemoryDb();
  seedUser(db, "u1", "alice");
  seedUser(db, "u2", "bob");
  pendingEdges(db, "u1", "u2", "alice", "bob");

  await profileFriendsHandler(db, auth("u1"), {
    action: "request",
    toUid: "u2",
  });

  assert.ok(db._store.has("users/u2/friendRequests/u1"));
  assert.ok(db._store.has("users/u1/outgoingFriendRequests/u2"));
});

test("accept converts pending edges into mutual friends", async () => {
  const db = createMemoryDb();
  seedUser(db, "u1", "alice");
  seedUser(db, "u2", "bob");
  pendingEdges(db, "u1", "u2", "alice", "bob");

  await profileFriendsHandler(db, auth("u2"), {
    action: "accept",
    fromUid: "u1",
  });

  assert.equal(db._store.get("users/u2/friends/u1")?.username, "alice");
  assert.equal(db._store.get("users/u1/friends/u2")?.username, "bob");
  assert.equal(db._store.has("users/u2/friendRequests/u1"), false);
  assert.equal(db._store.has("users/u1/outgoingFriendRequests/u2"), false);
});

test("decline clears pending edges without creating friends", async () => {
  const db = createMemoryDb();
  seedUser(db, "u1", "alice");
  seedUser(db, "u2", "bob");
  pendingEdges(db, "u1", "u2", "alice", "bob");

  await profileFriendsHandler(db, auth("u2"), {
    action: "decline",
    fromUid: "u1",
  });

  assert.equal(db._store.has("users/u2/friendRequests/u1"), false);
  assert.equal(db._store.has("users/u1/outgoingFriendRequests/u2"), false);
  assert.equal(db._store.has("users/u2/friends/u1"), false);
});

test("cancel clears outgoing pending edges", async () => {
  const db = createMemoryDb();
  seedUser(db, "u1", "alice");
  seedUser(db, "u2", "bob");
  pendingEdges(db, "u1", "u2", "alice", "bob");

  await profileFriendsHandler(db, auth("u1"), {
    action: "cancel",
    toUid: "u2",
  });

  assert.equal(db._store.has("users/u2/friendRequests/u1"), false);
  assert.equal(db._store.has("users/u1/outgoingFriendRequests/u2"), false);
});

test("mutual requests complete friendship without orphan pending docs", async () => {
  const db = createMemoryDb();
  seedUser(db, "u1", "alice");
  seedUser(db, "u2", "bob");
  pendingEdges(db, "u2", "u1", "bob", "alice");

  await profileFriendsHandler(db, auth("u1"), {
    action: "request",
    toUid: "u2",
  });

  assert.equal(db._store.get("users/u1/friends/u2")?.username, "bob");
  assert.equal(db._store.get("users/u2/friends/u1")?.username, "alice");
  assert.equal(db._store.has("users/u1/friendRequests/u2"), false);
  assert.equal(db._store.has("users/u2/outgoingFriendRequests/u1"), false);
  assert.equal(db._store.has("users/u2/friendRequests/u1"), false);
  assert.equal(db._store.has("users/u1/outgoingFriendRequests/u2"), false);
});

test("request to existing friend is rejected", async () => {
  const db = createMemoryDb();
  seedUser(db, "u1", "alice");
  seedUser(db, "u2", "bob");
  db._store.set("users/u1/friends/u2", {
    uid: "u2",
    username: "bob",
    since: "t0",
  });

  await assert.rejects(
    () =>
      profileFriendsHandler(db, auth("u1"), {
        action: "request",
        toUid: "u2",
      }),
    (error) => error.code === FRIENDS_ALREADY,
  );
});
