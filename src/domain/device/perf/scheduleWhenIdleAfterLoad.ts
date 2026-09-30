export type CancelIdleAfterLoad = () => void;

/** The slice of `window` the scheduler needs; injectable for tests. */
export type IdleAfterLoadHost = {
  document: { readyState: string };
  addEventListener(
    type: "load",
    listener: () => void,
    options: { once: true },
  ): void;
  removeEventListener(type: "load", listener: () => void): void;
  requestIdleCallback?: (
    callback: () => void,
    options: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(handle: number): void;
};

export type ScheduleWhenIdleAfterLoadOptions = {
  /** Max wait for idle once `load` has fired (requestIdleCallback timeout). */
  timeoutMs?: number;
  host?: IdleAfterLoadHost;
};

export const IDLE_AFTER_LOAD_TIMEOUT_MS = 3_000;

function defaultHost(): IdleAfterLoadHost | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window as unknown as IdleAfterLoadHost;
}

/**
 * Runs `callback` once, after the window `load` event and the next idle
 * period (bounded by `timeoutMs`). Unlike `scheduleIdleBootWork`, this waits
 * for `load`, so the work stays off the LCP / first-load network path.
 * Returns a cancel function; runs immediately when there is no window (SSR).
 */
export function scheduleWhenIdleAfterLoad(
  callback: () => void,
  options: ScheduleWhenIdleAfterLoadOptions = {},
): CancelIdleAfterLoad {
  const host = options.host ?? defaultHost();
  const timeoutMs = options.timeoutMs ?? IDLE_AFTER_LOAD_TIMEOUT_MS;

  if (!host) {
    callback();
    return () => undefined;
  }

  let done = false;
  let cancelPending: () => void = () => undefined;

  const run = () => {
    if (done) {
      return;
    }
    done = true;
    callback();
  };

  const scheduleIdle = () => {
    if (done) {
      return;
    }
    if (
      typeof host.requestIdleCallback === "function" &&
      typeof host.cancelIdleCallback === "function"
    ) {
      const handle = host.requestIdleCallback(run, { timeout: timeoutMs });
      cancelPending = () => host.cancelIdleCallback?.(handle);
      return;
    }
    const handle = host.setTimeout(run, 0);
    cancelPending = () => host.clearTimeout(handle);
  };

  if (host.document.readyState === "complete") {
    scheduleIdle();
  } else {
    host.addEventListener("load", scheduleIdle, { once: true });
    cancelPending = () => host.removeEventListener("load", scheduleIdle);
  }

  return () => {
    if (done) {
      return;
    }
    done = true;
    cancelPending();
  };
}
