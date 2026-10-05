import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDrawerPresentOpen } from "./useDrawerPresentOpen";

describe("useDrawerPresentOpen", () => {
  it("stays false on first paint when open is true, then becomes true", () => {
    // RTL flushes useEffect before renderHook returns; capture first paint via history.
    const paints: boolean[] = [];
    const { result } = renderHook(() => {
      const presented = useDrawerPresentOpen(true);
      paints.push(presented);
      return presented;
    });
    expect(paints[0]).toBe(false);
    expect(result.current).toBe(true);
  });

  it("goes false immediately when open becomes false", () => {
    const { result, rerender } = renderHook(({ open }) => useDrawerPresentOpen(open), {
      initialProps: { open: true },
    });
    expect(result.current).toBe(true);
    act(() => {
      rerender({ open: false });
    });
    expect(result.current).toBe(false);
  });

  it("re-latches on a later open cycle", () => {
    const paints: boolean[] = [];
    const { result, rerender } = renderHook(
      ({ open }) => {
        const presented = useDrawerPresentOpen(open);
        paints.push(presented);
        return presented;
      },
      { initialProps: { open: false } },
    );
    expect(result.current).toBe(false);
    paints.length = 0;
    act(() => {
      rerender({ open: true });
    });
    // First paint of the new open cycle stays closed; effect then latches open.
    expect(paints[0]).toBe(false);
    expect(result.current).toBe(true);
  });
});
