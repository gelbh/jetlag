import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { getFirestoreDb } from "../core/firebase";

export interface UserProfile {
  displayName: string;
  leaderboardOptIn: boolean;
}

function profileDoc(uid: string) {
  return doc(getFirestoreDb(), "users", uid, "profile", "main");
}

export async function readUserProfile(uid: string): Promise<UserProfile | null> {
  // Stub: wired when profile Cloud Functions land.
  void profileDoc(uid);
  return null;
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

      const data = snapshot.data();
      const displayName =
        typeof data.displayName === "string" ? data.displayName.trim() : "";
      if (!displayName) {
        onChange(null);
        return;
      }

      onChange({
        displayName,
        leaderboardOptIn: data.leaderboardOptIn === true,
      });
    },
    (error) => onError(error),
  );
}
