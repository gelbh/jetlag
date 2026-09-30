import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { isFirebaseConfigured } from "@/services/core/firebase/authBootstrapState";

type PermanentAuthDeps = {
  getFirebaseAuth: typeof import("@/services/core/firebase/firebase").getFirebaseAuth;
  onAuthStateChanged: typeof import("firebase/auth").onAuthStateChanged;
  waitForPermanentAuthReady: typeof import("@/services/core/firebase/firebaseAuthReady").waitForPermanentAuthReady;
};

// Dynamic so RouteReadinessSensor (App boot path) does not pull firebase/auth
// into the App chunk. Once loaded, later mounts read currentUser synchronously.
let loadedDeps: PermanentAuthDeps | null = null;
let depsPromise: Promise<PermanentAuthDeps> | null = null;

function loadPermanentAuthDeps(): Promise<PermanentAuthDeps> {
  depsPromise ??= Promise.all([
    import("firebase/auth"),
    import("@/services/core/firebase/firebase"),
    import("@/services/core/firebase/firebaseAuthReady"),
  ]).then(([authSdk, firebase, authReady]) => {
    loadedDeps = {
      getFirebaseAuth: firebase.getFirebaseAuth,
      onAuthStateChanged: authSdk.onAuthStateChanged,
      waitForPermanentAuthReady: authReady.waitForPermanentAuthReady,
    };
    return loadedDeps;
  }).catch((error: unknown) => {
    // Don't cache a transient chunk-load failure: the next mount retries.
    depsPromise = null;
    throw error;
  });
  return depsPromise;
}

// Local copy of accountAuth.isPermanentUser: that module statically imports firebase/auth.
function isPermanentUser(user: User | null): boolean {
  return user != null && !user.isAnonymous;
}

export function usePermanentAuthUser(): {
  user: User | null;
  isPermanent: boolean;
  authReady: boolean;
} {
  const [user, setUser] = useState<User | null>(() =>
    isFirebaseConfigured() && loadedDeps
      ? loadedDeps.getFirebaseAuth().currentUser
      : null,
  );
  const [authReady, setAuthReady] = useState(() => !isFirebaseConfigured());

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void loadPermanentAuthDeps()
      .then((deps) => {
        if (cancelled) {
          return;
        }

        void deps.waitForPermanentAuthReady().then(() => {
          if (!cancelled) {
            setAuthReady(true);
            setUser(deps.getFirebaseAuth().currentUser);
          }
        });

        unsubscribe = deps.onAuthStateChanged(deps.getFirebaseAuth(), (nextUser) => {
          setUser(nextUser);
        });
      })
      .catch(() => {
        // Fail open like waitForPermanentAuthReady's timeout: never hang readiness.
        if (!cancelled) {
          setAuthReady(true);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return {
    user,
    isPermanent: isPermanentUser(user),
    authReady,
  };
}
