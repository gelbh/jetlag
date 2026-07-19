import {
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
import { ANNOTATION_SYNC_MESSAGE_TYPE } from "../../services/session/backgroundSync";
import { flushOfflineQueue } from "../../services/session/flushOfflineQueue";
import { useSessionStore } from "../../state/sessionStore";
import {
  AppUpdateContext,
  type AppUpdateContextValue,
} from "./appUpdateContext";

type ServiceWorkerReloader = (reloadPage?: boolean) => Promise<void>;

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updateSW, setUpdateSW] = useState<ServiceWorkerReloader | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const location = useLocation();
  const session = useSessionStore((state) => state.session);

  const inActiveMapSession =
    Boolean(session) && location.pathname === "/map";
  const safeToReload = isSafeToReloadApp({
    session,
    pathname: location.pathname,
  });

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
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== ANNOTATION_SYNC_MESSAGE_TYPE) {
        return;
      }
      const sessionId = useSessionStore.getState().session?.id;
      if (!sessionId) {
        return;
      }
      void flushOfflineQueue(sessionId);
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
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
    };
  }, [
    dismissed,
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
