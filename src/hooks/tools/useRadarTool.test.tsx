import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useRadarTool } from "./useRadarTool";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";

describe("useRadarTool", () => {
  it("stores radar center from map taps", () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useRadarTool({
        active: true,
        annotations: mocks.annotations,
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
  });

  it("commits a radar annotation when center and answer are set", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useRadarTool({
        active: true,
        annotations: mocks.annotations,
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
      result.current.panel.props.onAnswerChange("yes");
    });

    await act(async () => {
      await result.current.commit();
    });

    expect(mocks.createAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "radar",
        metadata: expect.objectContaining({ inside: false }),
      }),
    );
  });
});
