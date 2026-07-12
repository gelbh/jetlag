const CHUNK_RELOAD_KEY = "jetlag:chunk-reload";
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

export function attemptChunkReload(): boolean {
  if (readSessionFlag()) {
    return false;
  }

  writeSessionFlag();
  window.location.reload();
  return true;
}

export function clearChunkReloadFlag(): void {
  removeSessionFlag();
}

export function clearBootReloadFlag(): void {
  try {
    sessionStorage.removeItem(BOOT_RELOAD_KEY);
  } catch {
    // sessionStorage may be unavailable in private browsing.
  }
}
