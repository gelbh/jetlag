import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WIZARD_STEP_CHANGE_EVENT } from "./tools/useSyncWizardStepRef";
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

  it("restores expanded panel when panning ends without user minimize", () => {
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

  it("stays expanded on wizard placement steps", () => {
    const { result } = renderHook(() => useToolPanelChrome("matching"));

    act(() => {
      window.dispatchEvent(
        new CustomEvent(WIZARD_STEP_CHANGE_EVENT, {
          detail: { stepId: "anchor" },
        }),
      );
    });

    expect(result.current.userMinimized).toBe(false);
    expect(result.current.panelMinimized).toBe(false);
  });

  it("keeps user-minimized state after panning ends", () => {
    const { result } = renderHook(() => useToolPanelChrome("matching"));

    act(() => {
      result.current.setPanelMinimized(true);
    });

    act(() => {
      result.current.handleMapPanStart();
    });

    expect(result.current.panelMinimized).toBe(true);

    act(() => {
      result.current.handleMapPanEnd();
    });

    expect(result.current.mapPanning).toBe(false);
    expect(result.current.userMinimized).toBe(true);
    expect(result.current.panelMinimized).toBe(true);
  });
});
