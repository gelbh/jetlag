interface SchedulerWithYield {
  yield?: () => Promise<void>;
}

/**
 * Lets the browser paint before synchronous geometry work, so a stage label
 * set just before it is actually visible. Costs about one frame.
 */
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: SchedulerWithYield }).scheduler;
  if (typeof scheduler?.yield === "function") {
    return scheduler.yield();
  }
  if (typeof MessageChannel !== "undefined") {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        resolve();
      };
      channel.port2.postMessage(null);
    });
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Calls {@link yieldToMain} at most every `budgetMs` of synchronous work in a loop. */
export function createYieldBudget(budgetMs = 16): () => Promise<void> {
  let sliceStart = Date.now();
  return async () => {
    if (Date.now() - sliceStart < budgetMs) {
      return;
    }
    await yieldToMain();
    sliceStart = Date.now();
  };
}
