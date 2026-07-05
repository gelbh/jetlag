import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMatchingTool } from "./useMatchingTool";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";

describe("useMatchingTool", () => {
  it("stores the seeker anchor from map taps", () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useMatchingTool({
        active: true,
        annotations: mocks.annotations,
        gameArea: mocks.gameArea,
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        gpsLoading: mocks.gpsLoading,
        mapError: mocks.mapError,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
      }),
    );

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    expect(result.current.draft.matchingSeekerPoint).toEqual([53.35, -6.26]);
  });
});
