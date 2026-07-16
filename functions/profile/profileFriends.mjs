export const FRIENDS_INVALID = "FRIENDS_INVALID";
export const FRIENDS_NOT_FOUND = "FRIENDS_NOT_FOUND";
export const FRIENDS_SELF = "FRIENDS_SELF";
export const FRIENDS_ALREADY = "FRIENDS_ALREADY";
export const FRIENDS_NO_REQUEST = "FRIENDS_NO_REQUEST";

function assertPermanent(auth) {
  if (!auth) {
    const err = new Error("Sign in required.");
    err.code = "unauthenticated";
    throw err;
  }
  if (auth.token?.firebase?.sign_in_provider === "anonymous") {
    const err = new Error("Permanent account required.");
    err.code = "failed-precondition";
    throw err;
  }
}

async function requireOwnUsername(db, uid) {
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("profile")
    .doc("main")
    .get();
  const username =
    typeof snap.data()?.username === "string"
      ? snap.data().username.trim()
      : "";
  if (!username) {
    const err = new Error("Set a username first.");
    err.code = FRIENDS_INVALID;
    throw err;
  }
  return username;
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {import('firebase-functions/v2/https').CallableRequest['auth']} auth
 * @param {{ action: string } & Record<string, unknown>} data
 */
export async function profileFriendsHandler(db, auth, data) {
  assertPermanent(auth);
  const uid = auth.uid;
  const action = typeof data?.action === "string" ? data.action : "";

  switch (action) {
    case "search":
      return searchUsernames(db, uid, data.query);
    case "request":
      return sendFriendRequest(db, uid, data.toUid);
    case "accept":
      return acceptFriendRequest(db, uid, data.fromUid);
    case "decline":
      return declineFriendRequest(db, uid, data.fromUid);
    case "cancel":
      return cancelFriendRequest(db, uid, data.toUid);
    case "list":
      return listFriends(db, uid);
    default: {
      const err = new Error("Unknown friends action.");
      err.code = FRIENDS_INVALID;
      throw err;
    }
  }
}

async function searchUsernames(db, uid, rawQuery) {
  await requireOwnUsername(db, uid);
  const query = String(rawQuery ?? "")
    .trim()
    .toLowerCase();
  if (query.length < 2) {
    const err = new Error("Enter at least 2 characters to search.");
    err.code = FRIENDS_INVALID;
    throw err;
  }

  const snap = await db
    .collection("usernames")
    .orderBy("__name__")
    .startAt(query)
    .endAt(`${query}\uf8ff`)
    .limit(10)
    .get();

  const results = [];
  for (const doc of snap.docs) {
    const data = doc.data() ?? {};
    const otherUid = typeof data.uid === "string" ? data.uid : "";
    if (!otherUid || otherUid === uid) {
      continue;
    }
    const username =
      typeof data.username === "string" && data.username.trim()
        ? data.username.trim()
        : doc.id;
    results.push({ uid: otherUid, username });
  }
  return { results };
}

async function sendFriendRequest(db, uid, toUidRaw) {
  const myUsername = await requireOwnUsername(db, uid);
  const toUid = typeof toUidRaw === "string" ? toUidRaw.trim() : "";
  if (!toUid) {
    const err = new Error("Missing friend target.");
    err.code = FRIENDS_INVALID;
    throw err;
  }
  if (toUid === uid) {
    const err = new Error("You cannot add yourself.");
    err.code = FRIENDS_SELF;
    throw err;
  }

  const theirProfile = await db
    .collection("users")
    .doc(toUid)
    .collection("profile")
    .doc("main")
    .get();
  const theirUsername =
    typeof theirProfile.data()?.username === "string"
      ? theirProfile.data().username.trim()
      : "";
  if (!theirUsername) {
    const err = new Error("Player not found.");
    err.code = FRIENDS_NOT_FOUND;
    throw err;
  }

  const friendRef = db.collection("users").doc(uid).collection("friends").doc(toUid);
  const incomingRef = db
    .collection("users")
    .doc(toUid)
    .collection("friendRequests")
    .doc(uid);
  const outgoingRef = db
    .collection("users")
    .doc(uid)
    .collection("outgoingFriendRequests")
    .doc(toUid);

  await db.runTransaction(async (tx) => {
    const reverseIncomingRef = db
      .collection("users")
      .doc(uid)
      .collection("friendRequests")
      .doc(toUid);
    const reverseOutgoingRef = db
      .collection("users")
      .doc(toUid)
      .collection("outgoingFriendRequests")
      .doc(uid);

    const [friendSnap, incomingSnap, reverseIncomingSnap] = await Promise.all([
      tx.get(friendRef),
      tx.get(incomingRef),
      tx.get(reverseIncomingRef),
    ]);
    if (friendSnap.exists) {
      const err = new Error("Already friends.");
      err.code = FRIENDS_ALREADY;
      throw err;
    }
    // They already requested us — complete the friendship instead of a second edge.
    if (reverseIncomingSnap.exists) {
      const now = new Date().toISOString();
      const fromUsername =
        typeof reverseIncomingSnap.data()?.fromUsername === "string"
          ? reverseIncomingSnap.data().fromUsername
          : theirUsername;
      tx.set(friendRef, { uid: toUid, username: theirUsername, since: now });
      tx.set(
        db.collection("users").doc(toUid).collection("friends").doc(uid),
        { uid, username: myUsername, since: now },
      );
      tx.delete(reverseIncomingRef);
      tx.delete(reverseOutgoingRef);
      return;
    }
    if (incomingSnap.exists) {
      return;
    }
    const now = new Date().toISOString();
    tx.set(incomingRef, {
      fromUid: uid,
      fromUsername: myUsername,
      createdAt: now,
    });
    tx.set(outgoingRef, {
      toUid,
      toUsername: theirUsername,
      createdAt: now,
    });
  });

  return { ok: true };
}

async function acceptFriendRequest(db, uid, fromUidRaw) {
  const myUsername = await requireOwnUsername(db, uid);
  const fromUid = typeof fromUidRaw === "string" ? fromUidRaw.trim() : "";
  if (!fromUid) {
    const err = new Error("Missing request.");
    err.code = FRIENDS_INVALID;
    throw err;
  }

  const requestRef = db
    .collection("users")
    .doc(uid)
    .collection("friendRequests")
    .doc(fromUid);
  const theirOutgoingRef = db
    .collection("users")
    .doc(fromUid)
    .collection("outgoingFriendRequests")
    .doc(uid);
  const myFriendRef = db.collection("users").doc(uid).collection("friends").doc(fromUid);
  const theirFriendRef = db
    .collection("users")
    .doc(fromUid)
    .collection("friends")
    .doc(uid);

  await db.runTransaction(async (tx) => {
    const requestSnap = await tx.get(requestRef);
    if (!requestSnap.exists) {
      const err = new Error("No pending request.");
      err.code = FRIENDS_NO_REQUEST;
      throw err;
    }
    const fromUsername =
      typeof requestSnap.data()?.fromUsername === "string"
        ? requestSnap.data().fromUsername
        : "Player";
    const now = new Date().toISOString();
    tx.set(myFriendRef, { uid: fromUid, username: fromUsername, since: now });
    tx.set(theirFriendRef, { uid, username: myUsername, since: now });
    tx.delete(requestRef);
    tx.delete(theirOutgoingRef);
    // Clear reverse pending edge if both sides had requested each other.
    tx.delete(
      db.collection("users").doc(uid).collection("outgoingFriendRequests").doc(fromUid),
    );
    tx.delete(
      db.collection("users").doc(fromUid).collection("friendRequests").doc(uid),
    );
  });

  return { ok: true };
}

async function declineFriendRequest(db, uid, fromUidRaw) {
  await requireOwnUsername(db, uid);
  const fromUid = typeof fromUidRaw === "string" ? fromUidRaw.trim() : "";
  if (!fromUid) {
    const err = new Error("Missing request.");
    err.code = FRIENDS_INVALID;
    throw err;
  }

  const requestRef = db
    .collection("users")
    .doc(uid)
    .collection("friendRequests")
    .doc(fromUid);
  const theirOutgoingRef = db
    .collection("users")
    .doc(fromUid)
    .collection("outgoingFriendRequests")
    .doc(uid);

  await db.runTransaction(async (tx) => {
    tx.delete(requestRef);
    tx.delete(theirOutgoingRef);
  });

  return { ok: true };
}

async function cancelFriendRequest(db, uid, toUidRaw) {
  await requireOwnUsername(db, uid);
  const toUid = typeof toUidRaw === "string" ? toUidRaw.trim() : "";
  if (!toUid) {
    const err = new Error("Missing request.");
    err.code = FRIENDS_INVALID;
    throw err;
  }

  const outgoingRef = db
    .collection("users")
    .doc(uid)
    .collection("outgoingFriendRequests")
    .doc(toUid);
  const theirIncomingRef = db
    .collection("users")
    .doc(toUid)
    .collection("friendRequests")
    .doc(uid);

  await db.runTransaction(async (tx) => {
    tx.delete(outgoingRef);
    tx.delete(theirIncomingRef);
  });

  return { ok: true };
}

async function listFriends(db, uid) {
  await requireOwnUsername(db, uid);
  const [friendsSnap, incomingSnap, outgoingSnap] = await Promise.all([
    db.collection("users").doc(uid).collection("friends").limit(100).get(),
    db.collection("users").doc(uid).collection("friendRequests").limit(50).get(),
    db
      .collection("users")
      .doc(uid)
      .collection("outgoingFriendRequests")
      .limit(50)
      .get(),
  ]);

  return {
    friends: friendsSnap.docs.map((doc) => ({
      uid: doc.id,
      username:
        typeof doc.data()?.username === "string"
          ? doc.data().username
          : doc.id,
    })),
    incoming: incomingSnap.docs.map((doc) => ({
      uid: doc.id,
      username:
        typeof doc.data()?.fromUsername === "string"
          ? doc.data().fromUsername
          : doc.id,
    })),
    outgoing: outgoingSnap.docs.map((doc) => ({
      uid: doc.id,
      username:
        typeof doc.data()?.toUsername === "string"
          ? doc.data().toUsername
          : doc.id,
    })),
  };
}
