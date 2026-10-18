import { describe, expect, it, vi } from "vitest";
import { createProgressRoot, type ProgressTreeOptions, type StageSpec } from "./progressTree";

function fakeTree(priors: Record<string, number> = {}) {
  let now = 0;
  const finished: Array<{ key: string; bucket?: number; durationMs: number }> = [];
  const options: ProgressTreeOptions = {
    now: () => now,
    expectedMs: (spec) => priors[spec.historyKey] ?? 1_000,
    onStageFinish: (spec, durationMs) =>
      finished.push({ key: spec.historyKey, bucket: spec.sizeBucket, durationMs }),
  };
  return {
    options,
    finished,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

const fetchSpec: StageSpec = { kind: "fetch", label: "Searching map data", historyKey: "fetch" };
const parseSpec: StageSpec = { kind: "parse", label: "Reading results", historyKey: "parse" };

describe("ProgressNode composite weights", () => {
  it("weights children by expected duration", () => {
    const clock = fakeTree({ fetch: 9_000, parse: 1_000 });
    const root = createProgressRoot("Task", clock.options);
    const fetch = root.stage(fetchSpec);
    root.stage(parseSpec);
    fetch.start().finish();
    expect(root.fraction()).toBeCloseTo(0.9);
  });

  it("credits a skipped stage immediately", () => {
    const clock = fakeTree();
    const root = createProgressRoot("Task", clock.options);
    const fetch = root.stage(fetchSpec);
    root.stage(parseSpec);
    fetch.finish();
    expect(root.fraction()).toBeCloseTo(0.5);
  });

  it("reports the deepest running stage label", () => {
    const clock = fakeTree();
    const root = createProgressRoot("Task", clock.options);
    root.stage(fetchSpec).start();
    expect(root.activeLeaf().label).toBe("Searching map data");
  });
});

describe("ProgressNode split", () => {
  it("keeps the root fraction unchanged at the moment of split", () => {
    const clock = fakeTree();
    const root = createProgressRoot("Task", clock.options);
    const fetch = root.stage(fetchSpec);
    root.stage(parseSpec);
    fetch.start();
    clock.advance(444);
    const before = root.fraction();
    expect(fetch.fraction()).toBeCloseTo(0.4, 1);
    fetch.split(4, { ...fetchSpec, sizeBucket: 3 });
    expect(root.fraction()).toBeCloseTo(before);
  });

  it("sums correctly through a nested split", () => {
    const clock = fakeTree();
    const root = createProgressRoot("Task", clock.options);
    const fetch = root.stage(fetchSpec);
    fetch.start();
    const quadrants = fetch.split(4, fetchSpec);
    quadrants[0].start().finish();
    const nested = quadrants[1].start().split(4, fetchSpec);
    for (const child of nested) {
      child.start().finish();
    }
    quadrants[1].finish();
    quadrants[2].start().finish();
    quadrants[3].start().finish();
    expect(fetch.fraction()).toBeCloseTo(1);
    fetch.finish();
    expect(root.fraction()).toBe(1);
  });

  it("records a split fetch's total time under its original bucket", () => {
    const clock = fakeTree();
    const root = createProgressRoot("Task", clock.options);
    const fetch = root.stage({ ...fetchSpec, sizeBucket: 8 });
    fetch.start();
    clock.advance(2_000);
    const parts = fetch.split(2, { ...fetchSpec, sizeBucket: 6 });
    for (const part of parts) {
      part.start();
      clock.advance(1_000);
      part.finish();
    }
    fetch.finish();
    expect(clock.finished).toContainEqual({ key: "fetch", bucket: 8, durationMs: 4_000 });
    expect(clock.finished.filter((entry) => entry.bucket === 6)).toHaveLength(2);
  });
});

describe("ProgressNode counted stages", () => {
  it("uses the count fraction and the EMA rate for remaining time", () => {
    const clock = fakeTree();
    const root = createProgressRoot("Task", clock.options);
    const cells = root.stage({ kind: "fetch", label: "Sampling", historyKey: "cells" });
    cells.setCount(0, 100);
    for (let step = 1; step <= 4; step += 1) {
      clock.advance(1_000);
      cells.setCount(step * 10, 100);
    }
    expect(cells.fraction()).toBeCloseTo(0.4);
    expect(cells.remainingMs()).toBeCloseTo(6_000);
    expect(root.hasWarmRate()).toBe(true);
  });

  it("falls back to the seeded rate before samples arrive", () => {
    const clock = fakeTree();
    const root = createProgressRoot("Task", clock.options);
    const cells = root.stage({ kind: "fetch", label: "Sampling", historyKey: "cells" });
    cells.seedRate(0.01);
    cells.setCount(0, 100);
    expect(cells.remainingMs()).toBeCloseTo(10_000);
  });
});

describe("ProgressNode parallel groups", () => {
  it("uses the slowest child for remaining time", () => {
    const clock = fakeTree({ a: 1_000, b: 4_000 });
    const root = createProgressRoot("Task", clock.options);
    const group = root.stage({ kind: "group", label: "All", historyKey: "g", parallel: true });
    group.stage({ kind: "fetch", label: "A", historyKey: "a" }).start();
    group.stage({ kind: "fetch", label: "B", historyKey: "b" }).start();
    expect(group.remainingMs()).toBe(4_000);
    expect(group.weight()).toBe(4_000);
  });
});

describe("ProgressNode mirror", () => {
  it("follows another tree's node", () => {
    const shared = fakeTree();
    const sharedRoot = createProgressRoot("Shared", shared.options);
    const source = sharedRoot.stage(fetchSpec);
    source.start();

    const clock = fakeTree();
    const root = createProgressRoot("Task", clock.options);
    const follower = root.stage({ ...fetchSpec, historyKey: "mirror" });
    follower.mirror(source);
    shared.advance(500);
    expect(follower.fraction()).toBeCloseTo(source.fraction());
    source.finish();
    expect(follower.fraction()).toBe(1);
  });

  it("does not record history for mirror nodes", () => {
    const clock = fakeTree();
    const root = createProgressRoot("Task", clock.options);
    const source = root.stage(fetchSpec);
    const follower = root.stage({ ...fetchSpec, historyKey: "mirror" });
    follower.mirror(source);
    clock.advance(100);
    follower.finish();
    expect(clock.finished.map((entry) => entry.key)).not.toContain("mirror");
  });
});

describe("ProgressNode notifications", () => {
  it("notifies on mutations", () => {
    const clock = fakeTree();
    const onChange = vi.fn();
    const root = createProgressRoot("Task", { ...clock.options, onChange });
    root.stage(fetchSpec).start().finish();
    expect(onChange).toHaveBeenCalled();
  });
});

describe("ProgressNode queue", () => {
  it("shows the queue label without starting the stage timer", () => {
    const clock = fakeTree();
    const root = createProgressRoot("Task", clock.options);
    const fetch = root.stage(fetchSpec);
    fetch.queue("Waiting for map server", 4_000);
    clock.advance(3_000);
    expect(root.activeLeaf().label).toBe("Waiting for map server");
    expect(fetch.fraction()).toBe(0);
    expect(fetch.remainingMs()).toBe(5_000);
    fetch.start();
    clock.advance(500);
    expect(fetch.label).toBe("Searching map data");
    fetch.finish();
    expect(clock.finished).toContainEqual({ key: "fetch", bucket: undefined, durationMs: 500 });
  });
});
