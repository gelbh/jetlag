import { useEffect, useState } from "react";
import { tryUpdateServiceWorker } from "../../domain/device/serviceWorkerUpdate";

type ServiceWorkerReloader = (reloadPage?: boolean) => Promise<void>;

export function AppUpdateBanner() {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<ServiceWorkerReloader | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;

    void import("virtual:pwa-register").then(({ registerSW }) => {
      const applyUpdate = registerSW({
        immediate: true,
        onNeedRefresh() {
          setNeedsRefresh(true);
        },
        onRegistered(nextRegistration) {
          registration = nextRegistration;
        },
        onRegisterError() {
          // Registration failures are handled by the browser.
        },
      });
      setUpdateSW(() => applyUpdate);
    });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        tryUpdateServiceWorker(registration);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (!needsRefresh) {
    return null;
  }

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 top-0 z-[var(--z-toast)] px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
      role="status"
      aria-live="polite"
    >
      <div className="hud-panel mx-auto flex max-w-xl items-center justify-between gap-3 px-3 py-2.5 pt-3.5 shadow-hud-float">
        <p className="text-sm font-medium text-ink">New version ready</p>
        <button
          type="button"
          className="btn-primary min-h-10 shrink-0 px-4 text-xs"
          onClick={() => {
            void updateSW?.(true);
          }}
        >
          Reload to update
        </button>
      </div>
    </div>
  );
}
