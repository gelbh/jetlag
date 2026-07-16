export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "jetlag",
  "official",
  "support",
  "system",
  "null",
  "undefined",
]);

export const CLAIM_USERNAME_INVALID = "CLAIM_USERNAME_INVALID";
export const CLAIM_USERNAME_TAKEN = "CLAIM_USERNAME_TAKEN";
export const CLAIM_USERNAME_ALREADY_SET = "CLAIM_USERNAME_ALREADY_SET";

// Keep in sync with src/domain/game/playerProfile.ts.
export function normalizeUsername(raw) {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export function validateUsername(raw) {
  const username = typeof raw === "string" ? raw.trim() : "";

  if (username.length === 0) {
    return { ok: false, error: "Enter a username." };
  }

  if (username.length < USERNAME_MIN_LENGTH) {
    return {
      ok: false,
      error: `Username must be at least ${USERNAME_MIN_LENGTH} characters.`,
    };
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Username must be ${USERNAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      error: "Username can only use letters, numbers, and underscore.",
    };
  }

  const normalized = normalizeUsername(username);

  if (RESERVED_USERNAMES.has(normalized)) {
    return { ok: false, error: "That username is reserved. Try another." };
  }

  return { ok: true, username, normalized };
}

export async function claimUsernameHandler(db, uid, rawUsername) {
  const validated = validateUsername(rawUsername);
  if (!validated.ok) {
    const error = new Error(CLAIM_USERNAME_INVALID);
    error.detail = validated.error;
    throw error;
  }

  const { username, normalized } = validated;
  const usernameRef = db.collection("usernames").doc(normalized);
  const profileRef = db
    .collection("users")
    .doc(uid)
    .collection("profile")
    .doc("main");

  const claimed = await db.runTransaction(async (transaction) => {
    const [usernameSnap, profileSnap] = await Promise.all([
      transaction.get(usernameRef),
      transaction.get(profileRef),
    ]);

    if (usernameSnap.exists && usernameSnap.data()?.uid !== uid) {
      throw new Error(CLAIM_USERNAME_TAKEN);
    }

    const existingProfile = profileSnap.exists ? profileSnap.data() : null;
    // v1: usernames are immutable once claimed — same claim is idempotent.
    if (existingProfile?.username) {
      const existingNormalized =
        typeof existingProfile.usernameNormalized === "string"
          ? existingProfile.usernameNormalized
          : String(existingProfile.username).trim().toLowerCase();
      if (
        existingNormalized === normalized &&
        (!usernameSnap.exists || usernameSnap.data()?.uid === uid)
      ) {
        return { username: String(existingProfile.username) };
      }
      throw new Error(CLAIM_USERNAME_ALREADY_SET);
    }

    const leaderboardOptIn = existingProfile?.leaderboardOptIn === true;

    transaction.set(usernameRef, {
      uid,
      username,
      claimedAt: new Date().toISOString(),
    });

    transaction.set(
      profileRef,
      {
        username,
        usernameNormalized: normalized,
        displayName: username,
        leaderboardOptIn,
      },
      { merge: true },
    );

    return { username };
  });

  return claimed;
}
