import { doc, getDoc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { getFirestoreDb } from "../core/firebase";

export interface UserProfile {
  username: string;
  usernameNormalized: string;
  displayName: string;
  leaderboardOptIn: boolean;
}

function profileDoc(uid: string) {
  return doc(getFirestoreDb(), "users", uid, "profile", "main");
}

function parseProfile(data: Record<string, unknown> | undefined): UserProfile | null {
  const username = typeof data?.username === "string" ? data.username.trim() : "";
  const legacyDisplayName =
    typeof data?.displayName === "string" ? data.displayName.trim() : "";
  const effectiveUsername = username || legacyDisplayName;

  if (!effectiveUsername) {
    return null;
  }

  const usernameNormalized =
    typeof data?.usernameNormalized === "string" && data.usernameNormalized.length > 0
      ? data.usernameNormalized
      : effectiveUsername.toLowerCase();

  return {
    username: effectiveUsername,
    usernameNormalized,
    displayName: effectiveUsername,
    leaderboardOptIn: data?.leaderboardOptIn === true,
  };
}

export async function readUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(profileDoc(uid));
  if (!snapshot.exists()) {
    return null;
  }

  return parseProfile(snapshot.data());
}

export function subscribeUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    profileDoc(uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }

      onChange(parseProfile(snapshot.data()));
    },
    (error) => onError(error),
  );
}
