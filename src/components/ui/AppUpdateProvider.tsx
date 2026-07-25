import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import {
  applyServiceWorkerUpdate,
  isSafeToReloadApp,
  maybeApplyPendingUpdate,
  promptIfWaiting,
  registerAppNeedRefreshHandler,
  scheduleServiceWorkerUpdateChecks,
} from "../../domain/device/serviceWorkerRefresh";
import { setServiceWorkerChunkReloadContext } from "../../domain/device/lazyWithChunkRetry";
import { tryUpdateServiceWorker } from "../../domain/device/serviceWorkerUpdate";
import { compareAppVersions } from "../../domain/session/sessionVersion";
import { useHotfixGraceReload } from "../../hooks/useHotfixGraceReload";
import { isFirebaseConfigured } from "../../services/core/firebase";
import {
  DEFAULT_HOTFIX_GRACE_SECONDS,
  subscribeAppConfigRuntime,
  type AppConfigRuntime,
} from "../../services/firestore/firestoreIncidents";
import { useSessionStore } from "../../state/sessionStore";
import {
  AppUpdateContext,
  type AppUpdateContextValue,
} from "./appUpdateContext";

type ServiceWorkerReloader = (reloadPage?: boolean) => Promise<void>;

function pickHigherVersion(
  left: string | undefined,
  right: string | undefined,
): string | null {
  if (!left && !right) {
    return null;
  }
  if (!left) {
    return right ?? null;
  }
  if (!right) {
    return left;
  }
  return compareAppVersions(left, right) >= 0 ? left : right;
}

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updateSW, setUpdateSW] = useState<ServiceWorkerReloader | null>(null);
  const [runtimeConfig, setRuntimeConfig] = useState<AppConfigRuntime | null>(
    null,
  );
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const lastSoftReloadMitigationIdRef = useRef<string | null>(null);
  const location = useLocation();
  const session = useSessionStore((state) => state.session);

  const inActiveMapSession =
    Boolean(session) && location.pathname === "/map";
  const safeToReload = isSafeToReloadApp({
    session,
    pathname: location.pathname,
  });

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    return subscribeAppConfigRuntime(setRuntimeConfig, () => {
      setRuntimeConfig(null);
    });
  }, []);

  const effectiveRuntimeConfig = isFirebaseConfigured() ? runtimeConfig : null;

  const requiredMinAppVersion = pickHigherVersion(
    session?.requiredMinAppVersion,
    effectiveRuntimeConfig?.requiredMinAppVersion,
  );
  const graceSeconds =
    requiredMinAppVersion &&
    session?.requiredMinAppVersion === requiredMinAppVersion &&
    typeof session.requiredMinAppVersionGraceSeconds === "number"
      ? session.requiredMinAppVersionGraceSeconds
      : (effectiveRuntimeConfig?.hotfixGraceSeconds ?? DEFAULT_HOTFIX_GRACE_SECONDS);

  const applyHotfixReload = useCallback(() => {
    void applyServiceWorkerUpdate(
      registrationRef.current,
      updateSW ?? undefined,
    );
  }, [updateSW]);

  const hotfixGrace = useHotfixGraceReload({
    requiredMinAppVersion,
    graceSeconds,
    reload: applyHotfixReload,
  });

  // Honor admin soft_reload mitigations once per mitigation id.
  useEffect(() => {
    const mitigation = session?.opsMitigation;
    if (!mitigation || mitigation.type !== "soft_reload") {
      return;
    }
    if (lastSoftReloadMitigationIdRef.current === mitigation.id) {
      return;
    }
    lastSoftReloadMitigationIdRef.current = mitigation.id;
    void applyServiceWorkerUpdate(
      registrationRef.current,
      updateSW ?? undefined,
    );
  }, [session?.opsMitigation, updateSW]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      return;
    }

    let stopScheduledChecks = () => {};

    void import("virtual:pwa-register").then(({ registerSW }) => {
      const applyUpdateFn = registerSW({
        immediate: true,
        onNeedRefresh() {
          setNeedsRefresh(true);
          setDismissed(false);
        },
        onRegistered(nextRegistration) {
          registrationRef.current = nextRegistration;
          promptIfWaiting(nextRegistration, () => {
            setNeedsRefresh(true);
            setDismissed(false);
          });
          stopScheduledChecks = scheduleServiceWorkerUpdateChecks(
            nextRegistration,
            () => {
              setNeedsRefresh(true);
              setDismissed(false);
            },
          );
        },
        onRegisterError() {
          // Registration failures are handled by the browser.
        },
      });
      setUpdateSW(() => applyUpdateFn);
    });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        tryUpdateServiceWorker(registrationRef.current);
        promptIfWaiting(registrationRef.current, () => {
          setNeedsRefresh(true);
          setDismissed(false);
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stopScheduledChecks();
    };
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV || location.pathname !== "/") {
      return;
    }

    tryUpdateServiceWorker(registrationRef.current);
    promptIfWaiting(registrationRef.current, () => {
      setNeedsRefresh(true);
      setDismissed(false);
    });
  }, [location.pathname]);

  useEffect(() => {
    return registerAppNeedRefreshHandler(() => {
      setNeedsRefresh(true);
      setDismissed(false);
    });
  }, []);

  useEffect(() => {
    setServiceWorkerChunkReloadContext({
      registration: registrationRef.current,
      applyUpdate: updateSW ?? undefined,
    });
  }, [updateSW]);

  useEffect(() => {
    if (import.meta.env.DEV || !updateSW) {
      return;
    }

    void maybeApplyPendingUpdate({
      needsRefresh,
      session,
      pathname: location.pathname,
      registration: registrationRef.current,
      applyUpdate: updateSW,
    });
  }, [needsRefresh, updateSW, location.pathname, session]);

  const value = useMemo<AppUpdateContextValue>(() => {
    const showMapChip =
      needsRefresh && inActiveMapSession && !dismissed && !safeToReload;
    const showGlobalBanner =
      needsRefresh &&
      !showMapChip &&
      !(inActiveMapSession && dismissed);

    return {
      inActiveMapSession,
      safeToReload,
      showMapChip,
      showGlobalBanner,
      dismissDeferred: () => setDismissed(true),
      applyUpdate: () => {
        void applyServiceWorkerUpdate(
          registrationRef.current,
          updateSW ?? undefined,
        );
      },
      hotfixGraceActive: hotfixGrace.active,
      hotfixGraceSecondsRemaining: hotfixGrace.secondsRemaining,
      hotfixRequiredMinAppVersion: hotfixGrace.requiredMinAppVersion,
    };
  }, [
    dismissed,
    hotfixGrace.active,
    hotfixGrace.requiredMinAppVersion,
    hotfixGrace.secondsRemaining,
    inActiveMapSession,
    needsRefresh,
    safeToReload,
    updateSW,
  ]);

  return (
    <AppUpdateContext.Provider value={value}>
      {children}
    </AppUpdateContext.Provider>
  );
}
