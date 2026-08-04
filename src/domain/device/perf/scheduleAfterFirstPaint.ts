type PaintCallback = () => void;

export type CancelIdleBootWork = () => void;

/**
 * Runs work after the browser has had a chance to paint (double rAF).
 * Falls back to setTimeout when rAF is unavailable (SSR/tests).
 */
export function scheduleAfterFirstPaint(callback: PaintCallback): void {
  if (typeof window === "undefined") {
    callback();
    return;
  }

  const requestFrame =
    typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : (cb: FrameRequestCallback) => window.setTimeout(() => cb(Date.now()), 0);

  requestFrame(() => {
    requestFrame(() => {
      callback();
    });
  });
}

/**
 * Runs non-critical boot work when the main thread is idle.
 * Uses requestIdleCallback with a timeout fallback.
 * Returns a cancel function (no-op after the callback runs or when SSR).
 */
export function scheduleIdleBootWork(callback: PaintCallback): CancelIdleBootWork {
  if (typeof window === "undefined") {
    callback();
    return () => undefined;
  }

  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 2_000 });
    return () => {
      window.cancelIdleCallback(id);
    };
  }

  const timeoutId = window.setTimeout(callback, 0);
  return () => {
    window.clearTimeout(timeoutId);
  };
}
