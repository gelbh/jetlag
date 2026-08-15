import { useEffect, useState, type ReactNode } from "react";
import { APP_VERSION } from "@/domain/device/changelog";
import { isBelowClientMinVersion } from "@/domain/device/clientMinVersion";
import { useAuthBootstrapReady } from "@/hooks/app/useAuthBootstrapReady";
import { isFirebaseConfigured } from "@/services/core/firebase/firebase";
import { subscribeClientMinVersion } from "@/services/firestore/clientMinVersion";
import { ClientUpdateRequiredPage } from "./ClientUpdateRequiredPage";

/**
 * Blocking global floor (ops/clientMinVersion). Distinct from hotfix grace
 * (appConfig/runtime) and peer session hostAppVersion.
 * Keep the app mounted while loading — only swap on a hard below-min result.
 */
export function ClientMinVersionGate({ children }: { children: ReactNode }) {
  const authReady = useAuthBootstrapReady();
  const firebaseReady = isFirebaseConfigured();
  const [minVersion, setMinVersion] = useState<string | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!authReady || !firebaseReady) {
      return;
    }

    let cancelled = false;
    const unsubscribe = subscribeClientMinVersion(
      (next) => {
        if (!cancelled) {
          setMinVersion(next);
        }
      },
      () => {
        // Fail-open on read errors when we cannot confirm a floor.
        if (!cancelled) {
          setMinVersion(null);
        }
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authReady, firebaseReady]);

  if (
    authReady &&
    firebaseReady &&
    typeof minVersion === "string" &&
    isBelowClientMinVersion(APP_VERSION, minVersion)
  ) {
    return <ClientUpdateRequiredPage minVersion={minVersion} />;
  }

  return children;
}
