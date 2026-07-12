import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  applyServiceWorkerUpdate,
  promptIfWaiting,
  scheduleServiceWorkerUpdateChecks,
  shouldAutoApplyServiceWorkerUpdate,
} from "../../domain/device/serviceWorkerRefresh";
import { isIosStandalonePwa } from "../../domain/device/isIosStandalonePwa";
import { tryUpdateServiceWorker } from "../../domain/device/serviceWorkerUpdate";
import { useSessionStore } from "../../state/sessionStore";
import { HudBanner } from "./HudBanner";

type ServiceWorkerReloader = (reloadPage?: boolean) => Promise<void>;

export function AppUpdateBanner() {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updateSW, setUpdateSW] = useState<ServiceWorkerReloader | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const location = useLocation();
  const session = useSessionStore((state) => state.session);

  const deferReload =
    Boolean(session) &&
    location.pathname === "/map" &&
    dismissed;

  useEffect(() => {
    if (import.meta.env.DEV) {
      return;
    }

    let stopScheduledChecks = () => {};

    void import("virtual:pwa-register").then(({ registerSW }) => {
      const applyUpdate = registerSW({
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
      setUpdateSW(() => applyUpdate);
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

  const visible = needsRefresh && !deferReload;
  const softBanner = Boolean(session) && location.pathname === "/map";

  useEffect(() => {
    if (!needsRefresh || !updateSW) {
      return;
    }

    if (!isIosStandalonePwa()) {
      return;
    }

    if (
      !shouldAutoApplyServiceWorkerUpdate({
        hasActiveSession: Boolean(session),
      })
    ) {
      return;
    }

    void applyServiceWorkerUpdate(registrationRef.current, updateSW);
  }, [needsRefresh, updateSW, location.pathname, session, dismissed]);

  return (
    <HudBanner
      visible={visible}
      animated={false}
      className="pointer-events-auto fixed inset-x-0 top-0 z-[var(--z-toast)] px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
    >
      <div
        className="hud-panel mx-auto flex max-w-xl items-center justify-between gap-3 px-3 py-2.5 pt-3.5 shadow-hud-float"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-ink">
          {softBanner
            ? "Update ready — reload after this game"
            : "New version ready"}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {softBanner ? (
            <button
              type="button"
              className="btn-secondary min-h-10 px-3 text-xs"
              onClick={() => setDismissed(true)}
            >
              Dismiss
            </button>
          ) : null}
          <button
            type="button"
            className="btn-primary min-h-10 px-4 text-xs"
            onClick={() => {
              void applyServiceWorkerUpdate(
                registrationRef.current,
                updateSW ?? undefined,
              );
            }}
          >
            Reload to update
          </button>
        </div>
      </div>
    </HudBanner>
  );
}
