import type { LoadPriority } from "@/domain/progress/progressTree";
import { abortReason } from "../../core/network/anySignal";
import { onSharedFetchPriorityChange } from "../cache";

const MAX_CONCURRENT = 2;
/** Background work never holds more than this many slots, so a user question waits for at most one request. */
const MAX_BACKGROUND_CONCURRENT = 1;

export interface SlotRequest {
  /** Read live, so a shared fetch promoted by a foreground caller changes lanes. */
  priority?: LoadPriority | (() => LoadPriority);
  signal?: AbortSignal;
  /** Number of requests that will be served before this one; 0 means next. */
  onQueuePosition?: (position: number) => void;
}

interface Holder {
  priority: () => LoadPriority;
}

interface Waiter extends Holder {
  seq: number;
  grant: (holder: Holder) => void;
  onQueuePosition?: (position: number) => void;
}

const holders = new Set<Holder>();
let waiters: Waiter[] = [];
let nextSeq = 0;

function priorityGetter(priority: SlotRequest["priority"]): () => LoadPriority {
  if (typeof priority === "function") {
    return priority;
  }
  const fixed = priority ?? "foreground";
  return () => fixed;
}

function backgroundHeld(): number {
  let count = 0;
  for (const holder of holders) {
    if (holder.priority() === "background") {
      count += 1;
    }
  }
  return count;
}

function serviceOrder(): Waiter[] {
  return [...waiters].sort((a, b) => {
    const aForeground = a.priority() === "foreground" ? 0 : 1;
    const bForeground = b.priority() === "foreground" ? 0 : 1;
    return aForeground - bForeground || a.seq - b.seq;
  });
}

function reportPositions(): void {
  serviceOrder().forEach((waiter, index) => {
    waiter.onQueuePosition?.(index);
  });
}

function dispatch(): void {
  let granted = true;
  while (granted && holders.size < MAX_CONCURRENT) {
    granted = false;
    const canRunBackground = backgroundHeld() < MAX_BACKGROUND_CONCURRENT;
    const next = serviceOrder().find(
      (waiter) => waiter.priority() === "foreground" || canRunBackground,
    );
    if (next) {
      waiters = waiters.filter((waiter) => waiter !== next);
      holders.add(next);
      next.grant(next);
      granted = true;
    }
  }
  reportPositions();
}

/** Re-evaluates lanes after a shared fetch's priority changed. */
export function notifyOverpassPriorityChanged(): void {
  dispatch();
}

// Shared cache fetches change lanes as subscribers join or leave.
onSharedFetchPriorityChange(dispatch);

function acquireSlot(request: SlotRequest): Promise<Holder> {
  const priority = priorityGetter(request.priority);
  const { signal } = request;
  if (signal?.aborted) {
    return Promise.reject(abortReason(signal));
  }

  nextSeq += 1;
  const seq = nextSeq;
  return new Promise((resolve, reject) => {
    const waiter: Waiter = {
      priority,
      seq,
      onQueuePosition: request.onQueuePosition,
      grant: (holder) => {
        signal?.removeEventListener("abort", onAbort);
        resolve(holder);
      },
    };
    const onAbort = () => {
      waiters = waiters.filter((entry) => entry !== waiter);
      reportPositions();
      reject(abortReason(signal as AbortSignal));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    waiters.push(waiter);
    dispatch();
  });
}

function releaseSlot(holder: Holder): void {
  holders.delete(holder);
  dispatch();
}

export async function withOverpassConcurrencyLimit<T>(
  task: () => Promise<T>,
  request: SlotRequest = {},
): Promise<T> {
  const holder = await acquireSlot(request);
  try {
    return await task();
  } finally {
    releaseSlot(holder);
  }
}

export function overpassQueueStateForTests(): { active: number; waiting: number } {
  return { active: holders.size, waiting: waiters.length };
}
