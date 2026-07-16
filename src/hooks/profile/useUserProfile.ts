import { useEffect, useState } from "react";
import {
  subscribeUserProfile,
  type UserProfile,
} from "../../services/firestore/firestoreProfile";

export function useUserProfile(
  uid: string | null | undefined,
  enabled: boolean,
): { profile: UserProfile | null; ready: boolean; error: Error | null } {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(!enabled);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !uid) {
      setProfile(null);
      setError(null);
      setReady(true);
      return;
    }

    setReady(false);
    setError(null);

    return subscribeUserProfile(
      uid,
      (nextProfile) => {
        setProfile(nextProfile);
        setError(null);
        setReady(true);
      },
      (nextError) => {
        setProfile(null);
        setError(nextError);
        setReady(true);
      },
    );
  }, [uid, enabled]);

  return { profile, ready, error };
}
