import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WizardSheetSnap } from "../../domain/wizard/phaseToSheetSnap";
import { WIZARD_STEP_CHANGE_EVENT } from "../tools/useSyncWizardStepRef";
import {
  MAP_PANNING_SAFETY_MS,
  useToolPanelChrome,
} from "./useToolPanelChrome";

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

  describe("stuck mapPanning safety", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("clears mapPanning if pan end never arrives", () => {
      const { result } = renderHook(() =>
        useToolPanelChrome("thermometer", { sheetSnap: "peek" }),
      );

      act(() => {
        result.current.handleMapPanStart();
      });
      expect(result.current.mapPanning).toBe(true);

      act(() => {
        vi.advanceTimersByTime(MAP_PANNING_SAFETY_MS);
      });

      expect(result.current.mapPanning).toBe(false);
      expect(result.current.userMinimized).toBe(true);
    });

    it("cancels the safety timer when pan ends normally", () => {
      const { result } = renderHook(() => useToolPanelChrome("radar"));

      act(() => {
        result.current.handleMapPanStart();
        result.current.handleMapPanEnd();
      });

      act(() => {
        vi.advanceTimersByTime(MAP_PANNING_SAFETY_MS);
      });

      expect(result.current.mapPanning).toBe(false);
    });
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
});
