import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTentacleTool } from "./useTentacleTool";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";

describe("useTentacleTool", () => {
  it("stores tentacle center from map taps", () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useTentacleTool({
        active: true,
        annotations: mocks.annotations,
        gameArea: mocks.gameArea,
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

    expect(result.current.draft.tentacleCenter).toEqual([53.35, -6.26]);
  });
});
