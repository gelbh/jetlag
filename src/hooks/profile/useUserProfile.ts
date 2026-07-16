import { useEffect, useState } from "react";
import {
  subscribeUserProfile,
  type UserProfile,
} from "../../services/firestore/firestoreProfile";

export function useUserProfile(
  uid: string | null | undefined,
  enabled: boolean,
): { profile: UserProfile | null; ready: boolean } {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled || !uid) {
      setProfile(null);
      setReady(true);
      return;
    }

    setReady(false);

    return subscribeUserProfile(
      uid,
      (nextProfile) => {
        setProfile(nextProfile);
        setReady(true);
      },
      () => {
        setProfile(null);
        setReady(true);
      },
    );
  }, [uid, enabled]);

  return { profile, ready };
}
