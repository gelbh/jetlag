import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { isIosStandalonePwa } from "../../domain/device/pwa/isIosStandalonePwa";
import { isStandalonePwa } from "../../domain/device/pwa/isStandalonePwa";
import {
  clearResumeVisualArtifacts,
  resumeWatchdogBudgets,
  rootHasInteractiveShell,
  rootHasResumeReady,
} from "../../domain/device/resumeShell";
import {
  BOOT_RELOAD_KEY,
  CHUNK_RELOAD_CLEAR_MS,
  hasChunkReloadBeenAttempted,
} from "../../domain/device/updates/chunkLoadRecovery";
import { clearActiveRevealTransition } from "../../navigation/revealRouteTransition";
import { useRouteTransition } from "../../navigation/useRouteTransition";
import { captureResumeShellUnresponsive } from "../../services/core/analytics/clientErrors";

export const RESUME_WATCHDOG_RELOAD_KEY = "jetlag:resume-watchdog-reload";

const RESUME_OFFLINE_BANNER_COPY = "You're offline. Reconnect to continue.";

function isAdminPathname(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function rootHasResumeSuccess(root: HTMLElement | null = document.getElementById("root")): boolean {
  return rootHasInteractiveShell(root) || rootHasResumeReady(root);
}

function readResumeWatchdogLatch(): boolean {
  try {
    return sessionStorage.getItem(RESUME_WATCHDOG_RELOAD_KEY) === "1";
  } catch {
    return false;
  }
}

function writeResumeWatchdogLatch(): boolean {
  try {
    sessionStorage.setItem(RESUME_WATCHDOG_RELOAD_KEY, "1");
    return sessionStorage.getItem(RESUME_WATCHDOG_RELOAD_KEY) === "1";
  } catch {
    return false;
  }
}

function clearResumeWatchdogLatch(): void {
  try {
    sessionStorage.removeItem(RESUME_WATCHDOG_RELOAD_KEY);
  } catch {}
}

function hasConflictingReloadLatch(): boolean {
  if (hasChunkReloadBeenAttempted()) {
    return true;
  }
  try {
    return sessionStorage.getItem(BOOT_RELOAD_KEY) === "1";
  } catch {
    return false;
  }
}

export function AppResumeWatchdog() {
  const location = useLocation();
  const { resetStuckTransition } = useRouteTransition();
  const hiddenAtRef = useRef<number | null>(null);
  const graceTimerRef = useRef<number | null>(null);
  const budgetTimerRef = useRef<number | null>(null);
  const rafIdsRef = useRef<number[]>([]);
  const clearLatchTimerRef = useRef<number | null>(null);
  const pathnameRef = useRef(location.pathname);
  const [offlineBannerVisible, setOfflineBannerVisible] = useState(false);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!offlineBannerVisible) {
      return;
    }
    const onOnline = () => {
      setOfflineBannerVisible(false);
    };
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, [offlineBannerVisible]);

  const cancelWatchdog = useCallback(() => {
    if (graceTimerRef.current !== null) {
      window.clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
    if (budgetTimerRef.current !== null) {
      window.clearTimeout(budgetTimerRef.current);
      budgetTimerRef.current = null;
    }
    for (const id of rafIdsRef.current) {
      window.cancelAnimationFrame(id);
    }
    rafIdsRef.current = [];
  }, []);

  const runResumeRecovery = useCallback(() => {
    clearResumeVisualArtifacts();
    resetStuckTransition();

    const backgroundMs = hiddenAtRef.current === null ? 0 : Date.now() - hiddenAtRef.current;

    cancelWatchdog();

    const { graceMs, budgetMs } = resumeWatchdogBudgets(pathnameRef.current);

    graceTimerRef.current = window.setTimeout(() => {
      graceTimerRef.current = null;
      let rafCount = 0;
      let settled = false;

      const succeed = () => {
        if (settled) {
          return;
        }
        settled = true;
        cancelWatchdog();
        clearResumeWatchdogLatch();
        if (clearLatchTimerRef.current !== null) {
          window.clearTimeout(clearLatchTimerRef.current);
        }
        clearLatchTimerRef.current = window.setTimeout(() => {
          clearResumeWatchdogLatch();
          clearLatchTimerRef.current = null;
        }, CHUNK_RELOAD_CLEAR_MS);
      };

      const fail = () => {
        if (settled) {
          return;
        }
        settled = true;
        cancelWatchdog();

        const pathname = pathnameRef.current;
        const offline = typeof navigator !== "undefined" && navigator.onLine === false;

        if (offline) {
          captureResumeShellUnresponsive({
            pathname,
            standalone: isStandalonePwa(),
            iosStandalone: isIosStandalonePwa(),
            backgroundMs,
            resumeOffline: true,
            ...(isAdminPathname(pathname) ? { adminRoute: true } : {}),
          });
          setOfflineBannerVisible(true);
          return;
        }

        if (
          readResumeWatchdogLatch() ||
          hasConflictingReloadLatch() ||
          !writeResumeWatchdogLatch()
        ) {
          return;
        }

        captureResumeShellUnresponsive({
          pathname,
          standalone: isStandalonePwa(),
          iosStandalone: isIosStandalonePwa(),
          backgroundMs,
          ...(isAdminPathname(pathname) ? { adminRoute: true } : {}),
        });
        window.location.reload();
      };

      budgetTimerRef.current = window.setTimeout(() => {
        budgetTimerRef.current = null;
        if (rafCount < 2 || !rootHasResumeSuccess()) {
          fail();
          return;
        }
        succeed();
      }, budgetMs);

      const tick = () => {
        rafCount += 1;
        if (rafCount >= 2 && rootHasResumeSuccess()) {
          succeed();
          return;
        }
        const id = window.requestAnimationFrame(tick);
        rafIdsRef.current.push(id);
      };

      const firstId = window.requestAnimationFrame(tick);
      rafIdsRef.current.push(firstId);
    }, graceMs);
  }, [cancelWatchdog, resetStuckTransition]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        cancelWatchdog();
        clearActiveRevealTransition();
        hiddenAtRef.current = Date.now();
        return;
      }
      // Cold open / never-hidden tabs are not resumes (JETLAG-2A false positives).
      if (hiddenAtRef.current === null) {
        return;
      }
      runResumeRecovery();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        return;
      }
      runResumeRecovery();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onPageShow);
      cancelWatchdog();
      if (clearLatchTimerRef.current !== null) {
        window.clearTimeout(clearLatchTimerRef.current);
      }
    };
  }, [cancelWatchdog, runResumeRecovery]);

  if (!offlineBannerVisible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[var(--z-toast)] px-3 pt-[max(0.5rem,var(--safe-area-top))]">
      <p
        role="status"
        className="pointer-events-auto mx-auto max-w-[min(calc(100%-1.5rem),24rem)] rounded-md border border-rule bg-canvas/95 px-3 py-2 font-display text-xs font-semibold uppercase tracking-[0.08em] text-highlight shadow-sm"
      >
        {RESUME_OFFLINE_BANNER_COPY}
      </p>
    </div>
  );
}
