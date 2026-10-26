import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDurationHistoryForTests } from "./durationHistory";
import { createLoadTask, getGlobalLoadTasks, LOAD_TASK_TICK_MS, runLoadTask } from "./loadTask";

const fetchSpec = {
  kind: "fetch" as const,
  label: "Searching map data",
  historyKey: "test:fetch",
  expectedMs: 4_000,
};

describe("createLoadTask", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetDurationHistoryForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a cached snapshot between emits", () => {
    const task = createLoadTask({ label: "Finding museum" });
    expect(task.getSnapshot()).toBe(task.getSnapshot());
  });

  it("advances a pending timed stage while subscribed", async () => {
    const task = createLoadTask({ label: "Finding museum" });
    const listener = vi.fn();
    task.subscribe(listener);
    task.stage(fetchSpec).start();
    await vi.advanceTimersByTimeAsync(2_000);
    const snapshot = task.getSnapshot();
    expect(listener).toHaveBeenCalled();
    expect(snapshot.percent).toBeGreaterThanOrEqual(35);
    expect(snapshot.stageLabel).toBe("Searching map data");
  });

  it("throttles emits to one per frame", async () => {
    const task = createLoadTask({ label: "Finding museum" });
    const listener = vi.fn();
    task.subscribe(listener);
    const stage = task.stage(fetchSpec);
    stage.start();
    stage.setLabel("A");
    stage.setLabel("B");
    await vi.advanceTimersByTimeAsync(20);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("hides the ETA during warm-up", async () => {
    const task = createLoadTask({ label: "Finding museum" });
    task.subscribe(() => {});
    task.stage(fetchSpec).start();
    await vi.advanceTimersByTimeAsync(LOAD_TASK_TICK_MS * 2);
    expect(task.getSnapshot().etaMs).toBeNull();
    await vi.advanceTimersByTimeAsync(1_500);
    expect(task.getSnapshot().etaMs).not.toBeNull();
  });

  it("never lowers the percent when the plan grows", async () => {
    const task = createLoadTask({ label: "Finding museum" });
    task.subscribe(() => {});
    const first = task.stage(fetchSpec);
    first.start();
    await vi.advanceTimersByTimeAsync(3_000);
    const before = task.getSnapshot().percent;
    task.stage({ ...fetchSpec, expectedMs: 40_000 });
    first.split(4, fetchSpec);
    await vi.advanceTimersByTimeAsync(LOAD_TASK_TICK_MS);
    expect(task.getSnapshot().percent).toBeGreaterThanOrEqual(before);
  });

  it("flags overdue and drops the ETA", async () => {
    const task = createLoadTask({ label: "Finding museum" });
    task.subscribe(() => {});
    task.stage(fetchSpec).start();
    await vi.advanceTimersByTimeAsync(6_500);
    const snapshot = task.getSnapshot();
    expect(snapshot.overdue).toBe(true);
    expect(snapshot.etaMs).toBeNull();
    expect(snapshot.percent).toBeLessThan(100);
  });

  it("does not flag a queued stage as overdue", async () => {
    const task = createLoadTask({ label: "Finding museum" });
    task.subscribe(() => {});
    const stage = task.stage(fetchSpec);
    stage.queue("Waiting for map server", 4_000);

    await vi.advanceTimersByTimeAsync(6_500);
    expect(task.getSnapshot()).toMatchObject({ overdue: false, percent: 0 });

    stage.start();
    await vi.advanceTimersByTimeAsync(6_500);
    expect(task.getSnapshot().overdue).toBe(true);
  });

  it("reaches 100 only on complete", () => {
    const task = createLoadTask({ label: "Finding museum" });
    task.stage(fetchSpec).start();
    task.complete();
    expect(task.getSnapshot()).toMatchObject({ percent: 100, status: "done" });
  });

  it("aborts its signal on cancel", () => {
    const task = createLoadTask({ label: "Finding museum" });
    task.cancel();
    expect(task.signal.aborted).toBe(true);
    expect(task.getSnapshot()).toMatchObject({ status: "cancelled", cancellable: false });
  });

  it("cancels when the parent signal aborts", () => {
    const parent = new AbortController();
    const task = createLoadTask({ label: "Finding museum", signal: parent.signal });
    parent.abort();
    expect(task.getSnapshot().status).toBe("cancelled");
  });

  it("is not cancellable in the background lane by default", () => {
    const task = createLoadTask({ label: "Mask", priority: "background" });
    expect(task.getSnapshot().cancellable).toBe(false);
  });

  it("registers global tasks until they end", () => {
    const task = createLoadTask({ label: "Picking a question", global: true });
    expect(getGlobalLoadTasks()).toContain(task);
    task.complete();
    expect(getGlobalLoadTasks()).not.toContain(task);
  });
});

describe("runLoadTask", () => {
  it("completes on success and cancels quietly on abort", async () => {
    const ok = createLoadTask({ label: "ok" });
    await expect(runLoadTask(ok, async () => 1)).resolves.toBe(1);
    expect(ok.getSnapshot().status).toBe("done");

    const aborted = createLoadTask({ label: "aborted" });
    await expect(
      runLoadTask(aborted, async (task) => {
        task.cancel();
        throw new DOMException("Cancelled.", "AbortError");
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(aborted.getSnapshot().status).toBe("cancelled");

    const failed = createLoadTask({ label: "failed" });
    await expect(
      runLoadTask(failed, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(failed.getSnapshot().status).toBe("failed");
  });
});
