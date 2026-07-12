import {
  applyServiceWorkerUpdate,
  getServiceWorkerApplyContext,
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
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

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

export function attemptChunkReload(options?: {
  session?: unknown;
  pathname?: string;
  onNeedRefresh?: () => void;
}): boolean {
  if (readSessionFlag()) {
    return false;
  }

  if (
    options &&
    !isSafeToReloadApp({
      session: options.session,
      pathname: options.pathname ?? "/",
    })
  ) {
    writeDeferredFlag();
    options.onNeedRefresh?.();
    return false;
  }

  removeDeferredFlag();
  writeSessionFlag();

  const { registration, applyUpdate } = getServiceWorkerApplyContext();
  if (registration?.waiting || applyUpdate) {
    void applyServiceWorkerUpdate(registration, applyUpdate);
    return true;
  }

  window.location.reload();
  return true;
}

export function tryApplyDeferredChunkReload(options: {
  session: unknown;
  pathname: string;
  onNeedRefresh?: () => void;
}): boolean {
  if (!wasChunkReloadDeferred()) {
    return false;
  }

  if (options.pathname === "/map") {
    return false;
  }

  if (
    !isSafeToReloadApp({
      session: options.session,
      pathname: options.pathname,
    })
  ) {
    return false;
  }

  return attemptChunkReload({
    session: options.session,
    pathname: options.pathname,
    onNeedRefresh: options.onNeedRefresh,
  });
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
