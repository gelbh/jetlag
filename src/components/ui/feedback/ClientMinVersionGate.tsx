import { type ReactNode, useEffect, useState } from "react";
import { APP_VERSION } from "@/domain/device/changelog";
import { isBelowClientMinVersion } from "@/domain/device/clientMinVersion";
import { useAppCheckArmed } from "@/hooks/app/useAppCheckArmed";
import { useAuthBootstrapReady } from "@/hooks/app/useAuthBootstrapReady";
import { isFirebaseConfigured } from "@/services/core/firebase/authBootstrapState";
import { ClientUpdateRequiredPage } from "./ClientUpdateRequiredPage";

// Dynamic: keeps firestore off the App chunk's static graph.
const loadClientMinVersion = () => import("@/services/firestore/clientMinVersion");

/**
 * Blocking global floor (ops/clientMinVersion). Distinct from hotfix grace
 * (appConfig/runtime) and peer session hostAppVersion.
 * Keep the app mounted while loading — only swap on a hard below-min result.
 * Firestore is App Check-enforced, so the listener waits until a real consumer
 * armed App Check: subscribing first would load reCAPTCHA on public shells.
 */
export function ClientMinVersionGate({ children }: { children: ReactNode }) {
  const authReady = useAuthBootstrapReady();
  const appCheckArmed = useAppCheckArmed();
  const firebaseReady = isFirebaseConfigured();
  const [minVersion, setMinVersion] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!authReady || !appCheckArmed || !firebaseReady) {
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void loadClientMinVersion()
      .then(({ subscribeClientMinVersion }) => {
        if (cancelled) {
          return;
        }
        unsubscribe = subscribeClientMinVersion(
          (next) => {
            if (!cancelled) {
              setMinVersion(next);
            }
          },
          () => {
            if (!cancelled) {
              setMinVersion(null);
            }
          },
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMinVersion(null);
        }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [authReady, appCheckArmed, firebaseReady]);

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
