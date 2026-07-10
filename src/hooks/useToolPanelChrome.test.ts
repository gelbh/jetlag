import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useToolPanelChrome } from "./useToolPanelChrome";

describe("useToolPanelChrome", () => {
  it("minimizes immediately when panning with an active tool", () => {
    const { result } = renderHook(() => useToolPanelChrome("matching"));

    act(() => {
      result.current.handleMapPanStart();
    });

    expect(result.current.mapPanning).toBe(true);
    expect(result.current.panelMinimized).toBe(true);
  });

  it("does nothing when panning without an active tool", () => {
    const { result } = renderHook(() => useToolPanelChrome("none"));

    act(() => {
      result.current.handleMapPanStart();
    });

    expect(result.current.mapPanning).toBe(false);
    expect(result.current.panelMinimized).toBe(false);
  });

  it("restores the panel when panning ends", () => {
    const { result } = renderHook(() => useToolPanelChrome("radar"));

    act(() => {
      result.current.handleMapPanStart();
    });

    act(() => {
      result.current.handleMapPanEnd();
    });

    expect(result.current.mapPanning).toBe(false);
    expect(result.current.panelMinimized).toBe(false);
  });
});
