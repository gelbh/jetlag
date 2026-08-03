import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MapTool } from "../../domain/map/mapToolTypes";
import {
  publishWizardStep,
  useSyncWizardStepRef,
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
  it("derives peek snap and map attention from wizard step publishes", () => {
    const { result } = renderHook(() => useWizardSheetSnap("radar"));

    act(() => {
      publishWizardStep("radar", "anchor");
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

  it("seeds peek from legacy sync that publishes toolId null", () => {
    function useLegacyPanelAndSheet(tool: MapTool, stepId: string) {
      useSyncWizardStepRef(undefined, stepId);
      return useWizardSheetSnap(tool);
    }

    const { result, rerender } = renderHook(
      ({ tool, stepId }: { tool: MapTool; stepId: string }) =>
        useLegacyPanelAndSheet(tool, stepId),
      { initialProps: { tool: "none" as MapTool, stepId: "place" } },
    );

    rerender({ tool: "radar", stepId: "place" });

    expect(result.current.sheetSnap).toBe("peek");
    expect(result.current.mapAttentionActive).toBe(true);
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

  it("clears attention when the active tool becomes none", () => {
    const { result, rerender } = renderHook(
      ({ activeTool }: { activeTool: MapTool }) => useWizardSheetSnap(activeTool),
      { initialProps: { activeTool: "radar" as MapTool } },
    );

    act(() => {
      publishWizardStep("radar", "distance");
    });

    expect(result.current.sheetSnap).toBe("mid");

    rerender({ activeTool: "none" });
    expect(result.current.wizardStepId).toBeNull();
    expect(result.current.mapAttentionActive).toBe(false);
  });

  it("ignores step publishes from a different tool", () => {
    const { result } = renderHook(() => useWizardSheetSnap("radar"));

    act(() => {
      publishWizardStep("matching", "place");
    });

    expect(result.current.wizardStepId).toBeNull();
    expect(result.current.sheetSnap).toBe("mid");
  });
});
