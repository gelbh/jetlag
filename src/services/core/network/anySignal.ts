/** Aborted by a user or a superseding request, as opposed to a timeout. */
export function isAbortError(error: unknown): boolean {
  return (error instanceof DOMException || error instanceof Error) && error.name === "AbortError";
}

export function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
}

export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw abortReason(signal);
  }
}

/**
 * Signal that aborts when any input aborts. `AbortSignal.any` needs Safari
 * 17.4+, and the build targets es2022, so this combines manually.
 */
export function anySignal(signals: ReadonlyArray<AbortSignal | undefined>): {
  signal: AbortSignal;
  /** Detaches from the inputs; call when the combined signal is no longer needed. */
  dispose: () => void;
} {
  const controller = new AbortController();
  const present = signals.filter((signal): signal is AbortSignal => signal !== undefined);
  for (const signal of present) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return { signal: controller.signal, dispose: () => {} };
    }
  }
  const dispose = () => {
    for (const signal of present) {
      signal.removeEventListener("abort", onAbort);
    }
  };
  const onAbort = (event: Event) => {
    controller.abort((event.target as AbortSignal).reason);
    dispose();
  };
  for (const signal of present) {
    signal.addEventListener("abort", onAbort, { once: true });
  }
  return { signal: controller.signal, dispose };
}

/** `setTimeout` as a promise that rejects with the abort reason when `signal` aborts. */
export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));
      return;
    }
    const onAbort = () => {
      clearTimeout(timerId);
      reject(abortReason(signal as AbortSignal));
    };
    const timerId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
