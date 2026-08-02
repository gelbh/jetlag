import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MapTool } from "../../domain/map/mapToolTypes";
import {
  useSyncWizardStepRef,
  WIZARD_STEP_CHANGE_EVENT,
} from "../tools/useSyncWizardStepRef";
import { useWizardSheetSnap } from "./useWizardSheetSnap";

/** Mirrors panel (child) sync + map chrome (parent) sheet snap in one tree. */
function usePanelAndSheetSnap(tool: MapTool, stepId: string) {
  useSyncWizardStepRef(
    undefined,
    stepId,
    tool === "none" ? undefined : tool,
  );
  return useWizardSheetSnap(tool);
}

describe("useWizardSheetSnap", () => {
  it("derives peek snap and map attention from wizard step events", () => {
    const { result } = renderHook(() => useWizardSheetSnap("radar"));

    act(() => {
      window.dispatchEvent(
        new CustomEvent(WIZARD_STEP_CHANGE_EVENT, {
          detail: { stepId: "anchor", toolId: "radar" },
        }),
      );
    });

    expect(result.current.sheetSnap).toBe("peek");
    expect(result.current.mapAttentionActive).toBe(true);
  });

  it("seeds peek when the panel publishes in the same commit as tool open", () => {
    const { result, rerender } = renderHook(
      ({ tool, stepId }: { tool: MapTool; stepId: string }) =>
        usePanelAndSheetSnap(tool, stepId),
      { initialProps: { tool: "none" as MapTool, stepId: "place" } },
    );

    expect(result.current.wizardStepId).toBeNull();

    rerender({ tool: "radar", stepId: "place" });

    expect(result.current.sheetSnap).toBe("peek");
    expect(result.current.mapAttentionActive).toBe(true);
    expect(result.current.wizardStepId).toBe("place");
  });

  it("keeps place peek when switching between question tools", () => {
    const { result, rerender } = renderHook(
      ({ tool, stepId }: { tool: MapTool; stepId: string }) =>
        usePanelAndSheetSnap(tool, stepId),
      { initialProps: { tool: "radar" as MapTool, stepId: "distance" } },
    );

    expect(result.current.sheetSnap).toBe("mid");

    rerender({ tool: "matching", stepId: "place" });

    expect(result.current.sheetSnap).toBe("peek");
    expect(result.current.mapAttentionActive).toBe(true);
  });

  it("resets when the active tool changes to none", () => {
    const { result, rerender } = renderHook(
      ({ activeTool }: { activeTool: MapTool }) => useWizardSheetSnap(activeTool),
      { initialProps: { activeTool: "radar" as MapTool } },
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent(WIZARD_STEP_CHANGE_EVENT, {
          detail: { stepId: "distance", toolId: "radar" },
        }),
      );
    });

    expect(result.current.sheetSnap).toBe("mid");

    rerender({ activeTool: "none" });
    expect(result.current.wizardStepId).toBeNull();
    expect(result.current.mapAttentionActive).toBe(false);
  });

  it("ignores step events from a different tool", () => {
    const { result } = renderHook(() => useWizardSheetSnap("radar"));

    act(() => {
      window.dispatchEvent(
        new CustomEvent(WIZARD_STEP_CHANGE_EVENT, {
          detail: { stepId: "place", toolId: "matching" },
        }),
      );
    });

    expect(result.current.wizardStepId).toBeNull();
    expect(result.current.sheetSnap).toBe("mid");
  });
});
