import {
  ETA_WARMUP_MS,
  formatEtaSpoken,
  isOverdue,
  nextDisplayedEta,
} from "@/domain/progress/estimator";
import {
  createProgressRoot,
  type LoadPriority,
  type ProgressNode,
  type StageSpec,
} from "@/domain/progress/progressTree";
import { abortReason } from "../network/anySignal";
import { expectedStageMs, hydrateDurationHistory, recordStageDuration } from "./durationHistory";

export type LoadTaskStatus = "running" | "done" | "cancelled" | "failed";

export interface LoadTaskSnapshot {
  label: string;
  stageLabel: string;
  /** 0..100, never decreases within a task. */
  percent: number;
  /** Null while warming up or once overdue. */
  etaMs: number | null;
  elapsedMs: number;
  overdue: boolean;
  status: LoadTaskStatus;
  cancellable: boolean;
  /** Screen-reader value text, e.g. "54 percent, about 10 seconds left". */
  valueText: string;
}

export interface LoadTaskOptions {
  label: string;
  priority?: LoadPriority;
  /** Parent signal, e.g. a superseding-request controller. */
  signal?: AbortSignal;
  /** Shows a Cancel button. Defaults to true for foreground tasks. */
  cancellable?: boolean;
  /** Lists the task in the global activity chip. */
  global?: boolean;
}

export interface LoadTask {
  readonly id: string;
  readonly label: string;
  readonly priority: LoadPriority;
  readonly signal: AbortSignal;
  readonly root: ProgressNode;
  stage(spec: StageSpec): ProgressNode;
  cancel(): void;
  complete(): void;
  fail(error?: unknown): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): LoadTaskSnapshot;
}

/** Live refresh while running so a stalled request still advances the bar. */
export const LOAD_TASK_TICK_MS = 250;
const MAX_RUNNING_PERCENT = 99;

let nextTaskId = 0;

const globalTasks = new Set<LoadTask>();
const globalListeners = new Set<() => void>();
let globalSnapshot: readonly LoadTask[] = [];

function emitGlobal(): void {
  globalSnapshot = [...globalTasks];
  for (const listener of globalListeners) {
    listener();
  }
}

export function subscribeGlobalLoadTasks(listener: () => void): () => void {
  globalListeners.add(listener);
  return () => {
    globalListeners.delete(listener);
  };
}

export function getGlobalLoadTasks(): readonly LoadTask[] {
  return globalSnapshot;
}

function scheduleFrame(callback: () => void): void {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => callback());
    return;
  }
  setTimeout(callback, 16);
}

export function createLoadTask(options: LoadTaskOptions): LoadTask {
  void hydrateDurationHistory();

  nextTaskId += 1;
  const id = `load-${nextTaskId}`;
  const priority = options.priority ?? "foreground";
  const controller = new AbortController();
  const startedAt = Date.now();
  const listeners = new Set<() => void>();

  let status: LoadTaskStatus = "running";
  let shownPercent = 0;
  let shownEta: number | null = null;
  let snapshot: LoadTaskSnapshot;
  let framePending = false;
  let tickTimer: ReturnType<typeof setInterval> | null = null;
  let detachParent = () => {};

  const root = createProgressRoot(options.label, {
    now: () => Date.now(),
    expectedMs: (spec) => expectedStageMs(spec),
    onChange: () => scheduleEmit(),
    onStageFinish: (spec, durationMs) => {
      if (status === "running") {
        recordStageDuration(spec, durationMs);
      }
    },
  });

  function computeSnapshot(): LoadTaskSnapshot {
    const now = Date.now();
    const elapsedMs = now - startedAt;
    const rawPercent =
      status === "done" ? 100 : Math.min(MAX_RUNNING_PERCENT, root.fraction() * 100);
    shownPercent = Math.max(shownPercent, rawPercent);

    const overdue = status === "running" && isOverdue(elapsedMs, root.weight());
    const warm = elapsedMs >= ETA_WARMUP_MS || root.hasWarmRate();
    const rawEta = status === "running" && warm && !overdue ? root.remainingMs() : null;
    shownEta = nextDisplayedEta(shownEta, rawEta);

    const percent = Math.round(shownPercent);
    const valueText =
      shownEta === null ? `${percent} percent` : `${percent} percent, ${formatEtaSpoken(shownEta)}`;

    return {
      label: options.label,
      stageLabel: root.activeLeaf().label,
      percent,
      etaMs: shownEta,
      elapsedMs,
      overdue,
      status,
      cancellable: status === "running" && (options.cancellable ?? priority === "foreground"),
      valueText,
    };
  }

  function emitNow(): void {
    framePending = false;
    snapshot = computeSnapshot();
    for (const listener of listeners) {
      listener();
    }
  }

  function scheduleEmit(): void {
    if (framePending) {
      return;
    }
    framePending = true;
    scheduleFrame(emitNow);
  }

  function syncTicker(): void {
    const shouldTick = status === "running" && listeners.size > 0;
    if (shouldTick && tickTimer === null) {
      tickTimer = setInterval(scheduleEmit, LOAD_TASK_TICK_MS);
    } else if (!shouldTick && tickTimer !== null) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function end(next: LoadTaskStatus): void {
    if (status !== "running") {
      return;
    }
    status = next;
    detachParent();
    syncTicker();
    if (options.global) {
      globalTasks.delete(task);
      emitGlobal();
    }
    // Final state goes out synchronously so the readout never lingers a frame.
    emitNow();
  }

  const task: LoadTask = {
    id,
    label: options.label,
    priority,
    signal: controller.signal,
    root,
    stage: (spec) => root.stage(spec),
    cancel() {
      if (status !== "running") {
        return;
      }
      controller.abort(new DOMException("Cancelled.", "AbortError"));
      root.cancel();
      end("cancelled");
    },
    complete() {
      if (status !== "running") {
        return;
      }
      root.finish();
      end("done");
    },
    fail() {
      end("failed");
    },
    subscribe(listener) {
      listeners.add(listener);
      syncTicker();
      return () => {
        listeners.delete(listener);
        syncTicker();
      };
    },
    getSnapshot: () => snapshot,
  };

  snapshot = computeSnapshot();

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort(abortReason(options.signal));
      status = "cancelled";
      snapshot = computeSnapshot();
    } else {
      const parent = options.signal;
      const onParentAbort = () => task.cancel();
      parent.addEventListener("abort", onParentAbort, { once: true });
      detachParent = () => parent.removeEventListener("abort", onParentAbort);
    }
  }

  if (options.global && status === "running") {
    globalTasks.add(task);
    emitGlobal();
  }

  return task;
}

/** Runs `work` as a task, completing or failing it, and cancelling quietly on abort. */
export async function runLoadTask<T>(
  task: LoadTask,
  work: (task: LoadTask) => Promise<T>,
): Promise<T> {
  try {
    const result = await work(task);
    task.complete();
    return result;
  } catch (error) {
    if (task.signal.aborted) {
      task.cancel();
    } else {
      task.fail(error);
    }
    throw error;
  }
}

/**
 * Progress root that belongs to no task, for work shared between callers
 * (an in-flight cache fetch). Callers follow it with `node.mirror()`.
 */
export function createDetachedProgressRoot(label: string): ProgressNode {
  void hydrateDurationHistory();
  return createProgressRoot(label, {
    now: () => Date.now(),
    expectedMs: (spec) => expectedStageMs(spec),
    onStageFinish: (spec, durationMs) => recordStageDuration(spec, durationMs),
  });
}

const namedTasks = new Map<string, LoadTask>();
const namedListeners = new Set<() => void>();

/**
 * Publishes the current task for a well-known load (e.g. "hider-truths") so a
 * deeply nested readout can show it without threading props through every layer.
 */
export function setNamedLoadTask(name: string, task: LoadTask | null): void {
  if (task) {
    namedTasks.set(name, task);
  } else {
    namedTasks.delete(name);
  }
  for (const listener of namedListeners) {
    listener();
  }
}

export function getNamedLoadTask(name: string): LoadTask | null {
  return namedTasks.get(name) ?? null;
}

export function subscribeNamedLoadTasks(listener: () => void): () => void {
  namedListeners.add(listener);
  return () => {
    namedListeners.delete(listener);
  };
}

/**
 * Publishes `task` under `name` and returns a clear that only removes it while it
 * is still the published one, so a stale clear never hides a newer task.
 */
export function publishNamedLoadTask(name: string, task: LoadTask): () => void {
  setNamedLoadTask(name, task);
  return () => {
    if (getNamedLoadTask(name) === task) {
      setNamedLoadTask(name, null);
    }
  };
}
