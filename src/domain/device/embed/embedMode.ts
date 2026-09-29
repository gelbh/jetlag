/**
 * Embed mode: the app is framed by a host page (e.g. the gelbhart.dev
 * portfolio's iPhone preview) with `?embed=1`.
 *
 * Iframes always report `env(safe-area-inset-*)` as 0, so full-bleed chrome
 * would sit under the host's device bezel; embed mode stamps `<html>` so
 * base.css can stand in iPhone insets. A preview visitor is not really using
 * the app, so embed mode also keeps analytics and its consent prompt off.
 */
export const EMBED_PARAM = "embed";
export const EMBED_SESSION_KEY = "jl.embed";
export const EMBED_ATTRIBUTE_VALUE = "iphone";

let cached: boolean | undefined;

function isFramed(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin parent access throws — that is still a frame.
    return true;
  }
}

function detectEmbedMode(): boolean {
  if (typeof window === "undefined" || !isFramed()) {
    return false;
  }
  const requested =
    new URLSearchParams(window.location.search).get(EMBED_PARAM) === "1";
  try {
    // Remember for in-frame reloads that drop the query string.
    if (requested) {
      sessionStorage.setItem(EMBED_SESSION_KEY, "1");
      return true;
    }
    return sessionStorage.getItem(EMBED_SESSION_KEY) === "1";
  } catch {
    return requested;
  }
}

export function isEmbedMode(): boolean {
  cached ??= detectEmbedMode();
  return cached;
}

export function markEmbedShellAttribute(): void {
  if (typeof document === "undefined" || !isEmbedMode()) {
    return;
  }
  document.documentElement.dataset.embed = EMBED_ATTRIBUTE_VALUE;
}

export function resetEmbedModeForTests(): void {
  cached = undefined;
}
