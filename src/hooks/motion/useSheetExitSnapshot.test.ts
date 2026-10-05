import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSheetExitSnapshot } from "./useSheetExitSnapshot";

describe("useSheetExitSnapshot", () => {
  it("keeps the last snapshot while exiting then clears on exit end", () => {
    const { result, rerender } = renderHook(({ open, live }) => useSheetExitSnapshot(open, live), {
      initialProps: { open: false, live: null as { label: string } | null },
    });

    rerender({ open: true, live: { label: "radar" } });
    expect(result.current.mounted).toBe(true);
    expect(result.current.snapshot).toEqual({ label: "radar" });

    rerender({ open: false, live: null });
    expect(result.current.mounted).toBe(true);
    expect(result.current.snapshot).toEqual({ label: "radar" });

    act(() => {
      result.current.onExitTransitionEnd();
    });
    expect(result.current.mounted).toBe(false);
    expect(result.current.snapshot).toBeNull();
  });
});
