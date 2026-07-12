import { describe, expect, it, vi } from "vitest";
import { runTransformBenchmark } from "./motionBenchmark";

describe("runTransformBenchmark", () => {
  it("returns 0 in non-browser env", async () => {
    vi.stubGlobal("document", undefined);
    await expect(runTransformBenchmark()).resolves.toBe(0);
    vi.unstubAllGlobals();
  });

  it("returns a number in jsdom when rAF exists", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    const promise = runTransformBenchmark();
    // Simulate 10 frames at 16ms
    for (let i = 0; i < 10; i++) {
      frames[i]?.(i * 16);
    }
    const score = await promise;
    expect(typeof score).toBe("number");
    vi.unstubAllGlobals();
  });
});
