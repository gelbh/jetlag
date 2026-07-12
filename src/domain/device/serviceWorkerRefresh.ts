import { tryUpdateServiceWorker } from "./serviceWorkerUpdate";

const UPDATE_CHECK_INTERVAL_MS = 45 * 60 * 1000;
const RELOAD_FALLBACK_MS = 1500;

let appNeedRefreshHandler: (() => void) | undefined;
let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;
let serviceWorkerApplyUpdate:
  | ((reloadPage?: boolean) => Promise<void>)
  | undefined;

export function registerServiceWorkerApplyContext(
  registration: ServiceWorkerRegistration | undefined,
  applyUpdate: ((reloadPage?: boolean) => Promise<void>) | undefined,
): () => void {
  serviceWorkerRegistration = registration;
  serviceWorkerApplyUpdate = applyUpdate;
  return () => {
    serviceWorkerRegistration = undefined;
    serviceWorkerApplyUpdate = undefined;
  };
}

export function getServiceWorkerApplyContext(): {
  registration: ServiceWorkerRegistration | undefined;
  applyUpdate: ((reloadPage?: boolean) => Promise<void>) | undefined;
} {
  return {
    registration: serviceWorkerRegistration,
    applyUpdate: serviceWorkerApplyUpdate,
  };
}

export function isSafeToReloadApp(options: {
  session: unknown;
  pathname: string;
}): boolean {
  return !options.session || options.pathname !== "/map";
}

export function shouldAutoApplyServiceWorkerUpdate(options: {
  session: unknown;
  pathname: string;
}): boolean {
  return isSafeToReloadApp(options);
}

export function registerAppNeedRefreshHandler(handler: () => void): () => void {
  appNeedRefreshHandler = handler;
  return () => {
    if (appNeedRefreshHandler === handler) {
      appNeedRefreshHandler = undefined;
    }
  };
}

export function notifyAppNeedRefresh(): void {
  appNeedRefreshHandler?.();
}

export async function maybeApplyPendingUpdate(options: {
  needsRefresh: boolean;
  session: unknown;
  pathname: string;
  registration: ServiceWorkerRegistration | undefined;
  applyUpdate: (reloadPage?: boolean) => Promise<void>;
}): Promise<void> {
  if (!options.needsRefresh) {
    return;
  }

  if (
    !shouldAutoApplyServiceWorkerUpdate({
      session: options.session,
      pathname: options.pathname,
    })
  ) {
    return;
  }

  await applyServiceWorkerUpdate(options.registration, options.applyUpdate);
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
