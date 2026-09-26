import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMeasuringTool } from "./useMeasuringTool";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";

vi.mock("../../services/core/location/geolocation", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../services/core/location/geolocation")
    >();
  return {
    ...actual,
    queryGeolocationPermission: vi.fn(async () => "prompt" as const),
  };
});

describe("useMeasuringTool map-first", () => {
  it("suppresses the Ask sheet after a measure category is chosen", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useMeasuringTool({
        active: true,
        annotations: mocks.annotations,
        gameArea: DUBLIN_CITY_GAME_AREA,
        sessionRules: { gameSize: "medium" },
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        mapError: mocks.mapError,
        gpsLoading: mocks.gpsLoading,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
        awaitHiderAnswer: true,
      }),
    );

    expect(result.current.hud.suppressSheet).toBeFalsy();
    expect(result.current.hud.modeBody).not.toBeNull();

    act(() => {
      (
        result.current.hud.modeBody as {
          props: { onMeasureFromChange: (kind: string) => void };
        }
      ).props.onMeasureFromChange("train_station");
    });

    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBe(true);
    });

    expect(result.current.hud.mapOverlay).not.toBeNull();
    expect(result.current.hud.modeBody).toBeNull();
  });
});
