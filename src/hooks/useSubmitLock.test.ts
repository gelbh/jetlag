import { describe, expect, it } from "vitest";
import { useSubmitLock } from "./useSubmitLock";
import { renderHook, act } from "@testing-library/react";

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
});
