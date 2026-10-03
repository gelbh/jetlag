declare global {
  interface Window {
    /** Set by scripts/prerender-marketing.mjs before the app boots. */
    __JETLAG_PRERENDER__?: boolean;
  }
}

/**
 * True while scripts/prerender-marketing.mjs is snapshotting this page. The snapshot is what
 * `hydrateRoot` later has to match, so it must show the hydration-time render (no device,
 * storage or consent-driven UI), not this headless browser's own state.
 */
export function isPrerenderCapture(): boolean {
  return typeof window !== "undefined" && window.__JETLAG_PRERENDER__ === true;
}
