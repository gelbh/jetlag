import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { isPermanentUser } from "../../services/core/accountAuth";
import {
  getFirebaseAuth,
  isFirebaseConfigured,
  waitForAuthStateReady,
} from "../../services/core/firebase";

export function usePermanentAuthUser(): {
  user: User | null;
  isPermanent: boolean;
  authReady: boolean;
} {
  const [user, setUser] = useState<User | null>(() =>
    isFirebaseConfigured() ? getFirebaseAuth().currentUser : null,
  );
  const [authReady, setAuthReady] = useState(() => !isFirebaseConfigured());

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    let cancelled = false;

    void waitForAuthStateReady().then(() => {
      if (!cancelled) {
        setAuthReady(true);
        setUser(getFirebaseAuth().currentUser);
      }
    });

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return {
    user,
    isPermanent: isPermanentUser(user),
    authReady,
  };
}
