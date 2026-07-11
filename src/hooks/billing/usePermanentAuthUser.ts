import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { isPermanentUser } from "../../services/core/accountAuth";
import { getFirebaseAuth, isFirebaseConfigured } from "../../services/core/firebase";

export function usePermanentAuthUser(): {
  user: User | null;
  isPermanent: boolean;
} {
  const [user, setUser] = useState<User | null>(() =>
    isFirebaseConfigured() ? getFirebaseAuth().currentUser : null,
  );

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
    });

    return unsubscribe;
  }, []);

  return {
    user,
    isPermanent: isPermanentUser(user),
  };
}
