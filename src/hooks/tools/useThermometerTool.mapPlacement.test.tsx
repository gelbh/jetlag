import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useThermometerTool } from "./useThermometerTool";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => true,
}));

describe("useThermometerTool map-first", () => {
  it("suppresses the Ask sheet after choosing a distance", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useThermometerTool({
        active: true,
        annotations: mocks.annotations,
        sessionRules: { gameSize: "large" },
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        awaitHiderAnswer: false,
      }),
    );

    expect(result.current.hud.suppressSheet).toBeFalsy();

    act(() => {
      result.current.panel.props.onDistanceChange(1609.344);
    });

    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBe(true);
    });
    expect(result.current.hud.mapOverlay).not.toBeNull();
    expect(result.current.hud.modeBody).toBeNull();

    act(() => {
      result.current.hud.mapOverlay?.props.onPlacementModeChange("manual");
    });
    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });
    act(() => {
      result.current.handleMapClick([53.36, -6.25]);
    });

    await waitFor(() => {
      expect(result.current.draft.thermoA).toEqual([53.35, -6.26]);
      expect(result.current.draft.thermoB).toEqual([53.36, -6.25]);
    });
  });

  it("returns to distance sheet when change-setup clears pins", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useThermometerTool({
        active: true,
        annotations: mocks.annotations,
        sessionRules: { gameSize: "large" },
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        awaitHiderAnswer: false,
      }),
    );

    act(() => {
      result.current.panel.props.onDistanceChange(1609.344);
    });
    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBe(true);
    });

    act(() => {
      result.current.hud.mapOverlay?.props.onChangeSetup();
    });

    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBeFalsy();
    });
    expect(result.current.hud.modeBody).not.toBeNull();
  });
});
