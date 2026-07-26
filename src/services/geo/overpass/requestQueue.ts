const MAX_CONCURRENT = 2;

let activeCount = 0;
const waitQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (activeCount < MAX_CONCURRENT) {
    activeCount += 1;
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    waitQueue.push(() => {
      activeCount += 1;
      resolve();
    });
  });
}

function releaseSlot(): void {
  activeCount -= 1;
  const next = waitQueue.shift();
  if (next) {
    next();
  }
}

export async function withOverpassConcurrencyLimit<T>(
  task: () => Promise<T>,
): Promise<T> {
  await acquireSlot();
  try {
    return await task();
  } finally {
    releaseSlot();
  }
}
