import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { milesToMeters } from "../../domain/map/distance";
import { radarDistancePresetsForGameSize } from "../../domain/questions";
import { useMapStore } from "../../state/mapStore";
import { resetAllStores } from "../../test/helpers/storeReset";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import { useRadarTool } from "./useRadarTool";

describe("useRadarTool", () => {
  beforeEach(() => {
    resetAllStores();
    useMapStore.getState().setActiveTool("radar");
  });

  it("opens to the pending preset distance", async () => {
    const mocks = createToolHookMocks();
    const preset = radarDistancePresetsForGameSize("medium", "imperial")[1];
    useMapStore.getState().openToolPreset("radar", preset);

    const { result } = renderHook(() =>
      useRadarTool({
        active: true,
        annotations: mocks.annotations,
        gameSize: "medium",
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        mapError: mocks.mapError,
        gpsLoading: mocks.gpsLoading,
        awaitingPlacement: mocks.awaitingPlacement,
        setAwaitingPlacement: mocks.setAwaitingPlacement,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
        armPlacement: mocks.armPlacement,
      }),
    );

    await waitFor(() => expect(result.current.panel.props.radiusMeters).toBe(preset));
    expect(useMapStore.getState().toolPreset).toBeNull();
  });

  it("stores radar center from map taps", () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useRadarTool({
        active: true,
        annotations: mocks.annotations,
        gameSize: "medium",
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        mapError: mocks.mapError,
        gpsLoading: mocks.gpsLoading,
        awaitingPlacement: mocks.awaitingPlacement,
        setAwaitingPlacement: mocks.setAwaitingPlacement,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
        armPlacement: mocks.armPlacement,
      }),
    );

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    expect(result.current.draft.radarCenter).toEqual([53.35, -6.26]);

    act(() => {
      useMapStore.getState().setActiveTool("none");
    });

    expect(result.current.draft.radarCenter).toBeNull();
  });

  it("commits a radar annotation when center and answer are set", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useRadarTool({
        active: true,
        annotations: mocks.annotations,
        gameSize: "medium",
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        mapError: mocks.mapError,
        gpsLoading: mocks.gpsLoading,
        awaitingPlacement: mocks.awaitingPlacement,
        setAwaitingPlacement: mocks.setAwaitingPlacement,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
        armPlacement: mocks.armPlacement,
      }),
    );

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });
    act(() => {
      result.current.panel.props.onPresetSelect(milesToMeters(1));
      result.current.panel.props.onAnswerChange("yes");
    });

    await act(async () => {
      await result.current.commit();
    });

    expect(mocks.createAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "radar",
        metadata: expect.objectContaining({ inside: true }),
      }),
    );
  });
});
