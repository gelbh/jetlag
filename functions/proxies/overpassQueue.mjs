const MAX_CONCURRENT_OVERPASS = 1;
const premiumQueue = [];
const freeQueue = [];
let activeOverpassRequests = 0;

function dequeueNextEntry() {
  if (premiumQueue.length > 0) {
    return premiumQueue.shift();
  }

  if (freeQueue.length > 0) {
    return freeQueue.shift();
  }

  return undefined;
}

async function drainOverpassQueue() {
  while (activeOverpassRequests < MAX_CONCURRENT_OVERPASS) {
    const entry = dequeueNextEntry();
    if (!entry) {
      return;
    }

    activeOverpassRequests += 1;
    void (async () => {
      try {
        entry.resolve(await entry.task());
      } catch (error) {
        entry.reject(error);
      } finally {
        activeOverpassRequests -= 1;
        drainOverpassQueue();
      }
    })();
  }
}

export function enqueueOverpassFetch(tier, task) {
  return new Promise((resolve, reject) => {
    const entry = { task, resolve, reject };
    if (tier === "premium") {
      premiumQueue.push(entry);
    } else {
      freeQueue.push(entry);
    }

    drainOverpassQueue();
  });
}

export function overpassQueueDepthForTests() {
  return {
    premium: premiumQueue.length,
    free: freeQueue.length,
    active: activeOverpassRequests,
  };
}

export function clearOverpassQueueForTests() {
  premiumQueue.length = 0;
  freeQueue.length = 0;
  activeOverpassRequests = 0;
}
