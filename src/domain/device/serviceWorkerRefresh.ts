import { tryUpdateServiceWorker } from "./serviceWorkerUpdate";

const UPDATE_CHECK_INTERVAL_MS = 45 * 60 * 1000;
const RELOAD_FALLBACK_MS = 1500;

export function shouldAutoApplyServiceWorkerUpdate(options: {
  hasActiveSession: boolean;
}): boolean {
  return !options.hasActiveSession;
}

export function hasWaitingServiceWorker(
  registration: ServiceWorkerRegistration | undefined,
): boolean {
  return Boolean(registration?.waiting);
}

export function promptIfWaiting(
  registration: ServiceWorkerRegistration | undefined,
  onNeedRefresh: () => void,
): void {
  if (hasWaitingServiceWorker(registration)) {
    onNeedRefresh();
  }
}

export function scheduleServiceWorkerUpdateChecks(
  registration: ServiceWorkerRegistration | undefined,
  onNeedRefresh: () => void,
): () => void {
  const check = () => {
    tryUpdateServiceWorker(registration);
    promptIfWaiting(registration, onNeedRefresh);
  };

  const intervalId = window.setInterval(check, UPDATE_CHECK_INTERVAL_MS);

  return () => {
    window.clearInterval(intervalId);
  };
}

export async function applyServiceWorkerUpdate(
  registration: ServiceWorkerRegistration | undefined,
  registerApplyUpdate?: (reloadPage?: boolean) => Promise<void>,
): Promise<void> {
  registration?.waiting?.postMessage({ type: "SKIP_WAITING" });

  if (registerApplyUpdate) {
    await registerApplyUpdate(true);
    return;
  }

  window.setTimeout(() => {
    window.location.reload();
  }, RELOAD_FALLBACK_MS);
}
