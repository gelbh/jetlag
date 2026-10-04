import {
  applyServiceWorkerUpdate,
  hasWaitingServiceWorker,
  isSafeToReloadApp,
} from "./serviceWorkerRefresh";

const CHUNK_RELOAD_KEY = "jetlag:chunk-reload";
const CHUNK_DEFERRED_KEY = "jetlag:chunk-deferred";
export const BOOT_RELOAD_KEY = "jetlag:boot-reload";

export const CHUNK_RELOAD_CLEAR_MS = 10_000;

function readSessionFlag(): boolean {
  try {
    return sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSessionFlag(): void {
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  } catch {
    // sessionStorage may be unavailable in private browsing.
  }
}

function removeSessionFlag(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    // sessionStorage may be unavailable in private browsing.
  }
}

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";

  if (!message) {
    return false;
  }

  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("text/html") ||
    message.includes("MIME type")
  );
}

export function hasChunkReloadBeenAttempted(): boolean {
  return readSessionFlag();
}

function readDeferredFlag(): boolean {
  try {
    return sessionStorage.getItem(CHUNK_DEFERRED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDeferredFlag(): void {
  try {
    sessionStorage.setItem(CHUNK_DEFERRED_KEY, "1");
  } catch {
    // sessionStorage may be unavailable in private browsing.
  }
}

function removeDeferredFlag(): void {
  try {
    sessionStorage.removeItem(CHUNK_DEFERRED_KEY);
  } catch {
    // sessionStorage may be unavailable in private browsing.
  }
}

export function wasChunkReloadDeferred(): boolean {
  return readDeferredFlag();
}

export type ChunkReloadOptions = {
  session?: unknown;
  pathname?: string;
  onNeedRefresh?: () => void;
  registration?: ServiceWorkerRegistration;
  applyUpdate?: (reloadPage?: boolean) => Promise<void>;
  /** Defaults to `navigator.onLine === false`; injectable for tests and richer reachability checks. */
  isOffline?: () => boolean;
};

function isNavigatorOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

let pendingOnlineRetry: (() => void) | undefined;

function scheduleRetryWhenOnline(options: ChunkReloadOptions | undefined): void {
  if (pendingOnlineRetry || typeof window === "undefined") {
    return;
  }

  pendingOnlineRetry = () => {
    pendingOnlineRetry = undefined;
    attemptChunkReload(options);
  };
  window.addEventListener("online", pendingOnlineRetry, { once: true });
}

export function attemptChunkReload(options?: ChunkReloadOptions): boolean {
  if (readSessionFlag()) {
    return false;
  }

  // A reload while offline can't fetch the shell and lands on a blank page, so wait for the
  // network and retry once. The guard flag stays unset so that retry is not swallowed.
  if ((options?.isOffline ?? isNavigatorOffline)()) {
    writeDeferredFlag();
    scheduleRetryWhenOnline(options);
    return false;
  }

  if (
    options &&
    !isSafeToReloadApp({
      session: options.session,
    })
  ) {
    writeDeferredFlag();
    options.onNeedRefresh?.();
    return false;
  }

  removeDeferredFlag();
  writeSessionFlag();

  if (hasWaitingServiceWorker(options?.registration)) {
    void applyServiceWorkerUpdate(options?.registration, options?.applyUpdate);
    return true;
  }

  window.location.reload();
  return true;
}

export function tryApplyDeferredChunkReload(
  options: ChunkReloadOptions & { session: unknown; pathname: string },
): boolean {
  if (!wasChunkReloadDeferred()) {
    return false;
  }

  if (
    !isSafeToReloadApp({
      session: options.session,
    })
  ) {
    return false;
  }

  return attemptChunkReload(options);
}

export function clearChunkReloadFlag(): void {
  removeSessionFlag();
  removeDeferredFlag();
}

export function clearBootReloadFlag(): void {
  try {
    sessionStorage.removeItem(BOOT_RELOAD_KEY);
  } catch {
    // sessionStorage may be unavailable in private browsing.
  }
}
