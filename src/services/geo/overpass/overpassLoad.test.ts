import { describe, expect, it } from "vitest";
import { createLoadTask } from "../../core/progress/loadTask";
import { enrichInBackground, withBundleStage } from "./overpassLoad";

describe("withBundleStage", () => {
  it("returns the pack result and finishes its stage", async () => {
    const task = createLoadTask({ label: "Finding nearest museum" });
    await expect(withBundleStage(task, async () => ["pack"])).resolves.toEqual(["pack"]);
    expect(task.root.children[0]?.isFinished).toBe(true);
  });

  it("honours a Cancel pressed while the pack was loading", async () => {
    const task = createLoadTask({ label: "Finding nearest museum" });
    const read = withBundleStage(task, async () => {
      task.cancel();
      return ["pack"];
    });
    await expect(read).rejects.toMatchObject({ name: "AbortError" });
  });

  it("works without a task", async () => {
    await expect(withBundleStage(undefined, async () => 1)).resolves.toBe(1);
  });
});

describe("enrichInBackground", () => {
  it("completes its task and hands over the merged result", async () => {
    const task = createLoadTask({ label: "Confirming", cancellable: false });
    const merged = await new Promise<string[]>((resolve) => {
      enrichInBackground(
        () => task,
        { kind: "fetch", label: "Searching map data", historyKey: "test:enrich" },
        async () => ["merged"],
        resolve,
      );
    });
    expect(merged).toEqual(["merged"]);
    expect(task.getSnapshot().status).toBe("done");
  });

  it("soft-fails: a rejected enrich fails its task and never calls onDone", async () => {
    const task = createLoadTask({ label: "Confirming", cancellable: false });
    let called = false;
    enrichInBackground(
      () => task,
      { kind: "fetch", label: "Searching map data", historyKey: "test:enrich" },
      async () => {
        throw new Error("Overpass down");
      },
      () => {
        called = true;
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(called).toBe(false);
    expect(task.getSnapshot().status).toBe("failed");
  });
});
