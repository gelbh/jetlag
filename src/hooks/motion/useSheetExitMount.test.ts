import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSheetExitMount } from "./useSheetExitMount";

describe("useSheetExitMount", () => {
  it("mounts when open becomes true and stays mounted until exit end", () => {
    const { result, rerender } = renderHook(({ open }) => useSheetExitMount(open), {
      initialProps: { open: false },
    });

    expect(result.current.mounted).toBe(false);

    rerender({ open: true });
    expect(result.current.mounted).toBe(true);
    expect(result.current.open).toBe(true);

    rerender({ open: false });
    expect(result.current.mounted).toBe(true);
    expect(result.current.open).toBe(false);

    act(() => {
      result.current.onExitTransitionEnd();
    });
    expect(result.current.mounted).toBe(false);
  });

  it("ignores exit end while still open", () => {
    const { result } = renderHook(() => useSheetExitMount(true));
    act(() => {
      result.current.onExitTransitionEnd();
    });
    expect(result.current.mounted).toBe(true);
  });
});
