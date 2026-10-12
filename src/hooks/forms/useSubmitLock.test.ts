import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSubmitLock } from "./useSubmitLock";

describe("useSubmitLock", () => {
  it("ignores overlapping runs while a submit is in flight", async () => {
    const { result } = renderHook(() => useSubmitLock());
    let runs = 0;

    await act(async () => {
      await Promise.all([
        result.current.runLocked(async () => {
          runs += 1;
          await new Promise((resolve) => setTimeout(resolve, 20));
        }),
        result.current.runLocked(async () => {
          runs += 1;
        }),
      ]);
    });

    expect(runs).toBe(1);
  });

  it("releases the lock and rethrows when the run rejects", async () => {
    const { result } = renderHook(() => useSubmitLock());

    await act(async () => {
      await expect(
        result.current.runLocked(async () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
    });

    expect(result.current.isSubmitting).toBe(false);
    let ran = false;
    await act(async () => {
      await result.current.runLocked(async () => {
        ran = true;
      });
    });
    expect(ran).toBe(true);
  });
});
