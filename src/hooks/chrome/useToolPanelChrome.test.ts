import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WizardSheetSnap } from "../../domain/wizard/phaseToSheetSnap";
import { WIZARD_STEP_CHANGE_EVENT } from "../tools/useSyncWizardStepRef";
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
          detail: { stepId: "place" },
        }),
      );
    });

    expect(result.current.userMinimized).toBe(false);
    expect(result.current.panelMinimized).toBe(false);
  });

  it("auto-peeks on place-phase snap and keeps an explicit expand", () => {
    const { result, rerender } = renderHook(
      ({ sheetSnap }: { sheetSnap: WizardSheetSnap }) =>
        useToolPanelChrome("thermometer", { sheetSnap }),
      { initialProps: { sheetSnap: "mid" as WizardSheetSnap } },
    );

    rerender({ sheetSnap: "peek" });
    expect(result.current.userMinimized).toBe(true);

    act(() => {
      result.current.setPanelMinimized(false);
    });
    expect(result.current.userMinimized).toBe(false);

    rerender({ sheetSnap: "peek" });
    expect(result.current.userMinimized).toBe(false);

    rerender({ sheetSnap: "mid" });
    expect(result.current.userMinimized).toBe(false);
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

  it("keeps place-phase peek after a pan cycle (tool stays open)", () => {
    const { result } = renderHook(() =>
      useToolPanelChrome("thermometer", { sheetSnap: "peek" }),
    );

    expect(result.current.userMinimized).toBe(true);

    act(() => {
      result.current.handleMapPanStart();
    });
    expect(result.current.mapPanning).toBe(true);

    act(() => {
      result.current.handleMapPanEnd();
    });

    expect(result.current.mapPanning).toBe(false);
    expect(result.current.userMinimized).toBe(true);
    expect(result.current.panelMinimized).toBe(true);
  });

  it("clears stuck mapPanning when the active tool changes", () => {
    const { result, rerender } = renderHook(
      ({ tool }: { tool: "thermometer" | "none" }) => useToolPanelChrome(tool),
      { initialProps: { tool: "thermometer" as const } },
    );

    act(() => {
      result.current.handleMapPanStart();
    });
    expect(result.current.mapPanning).toBe(true);

    rerender({ tool: "none" });
    expect(result.current.mapPanning).toBe(false);
  });
});
