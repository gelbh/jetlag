import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MapTool } from "../../domain/map/mapToolTypes";
import { WIZARD_STEP_CHANGE_EVENT } from "../tools/useSyncWizardStepRef";
import { useWizardSheetSnap } from "./useWizardSheetSnap";

describe("useWizardSheetSnap", () => {
  it("derives peek snap and map attention from wizard step events", () => {
    const { result } = renderHook(() => useWizardSheetSnap("radar"));

    act(() => {
      window.dispatchEvent(
        new CustomEvent(WIZARD_STEP_CHANGE_EVENT, {
          detail: { stepId: "anchor" },
        }),
      );
    });

    expect(result.current.sheetSnap).toBe("peek");
    expect(result.current.mapAttentionActive).toBe(true);
  });

  it("resets when the active tool changes", () => {
    const { result, rerender } = renderHook(
      ({ activeTool }: { activeTool: MapTool }) => useWizardSheetSnap(activeTool),
      { initialProps: { activeTool: "radar" as MapTool } },
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent(WIZARD_STEP_CHANGE_EVENT, {
          detail: { stepId: "distance" },
        }),
      );
    });

    expect(result.current.sheetSnap).toBe("mid");

    rerender({ activeTool: "none" });
    expect(result.current.wizardStepId).toBeNull();
    expect(result.current.mapAttentionActive).toBe(false);
  });
});
