import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useRadarTool } from "./useRadarTool";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import { milesToMeters } from "../../domain/map/distance";

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

describe("useRadarTool map-first", () => {
  it("suppresses the Ask sheet after a distance is chosen", async () => {
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
        awaitingPlacement: false,
        setAwaitingPlacement: mocks.setAwaitingPlacement,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
        armPlacement: vi.fn(),
        awaitHiderAnswer: true,
      }),
    );

    expect(result.current.hud.suppressSheet).toBeFalsy();
    expect(result.current.hud.modeBody).not.toBeNull();

    const oneMile = milesToMeters(1);
    act(() => {
      (
        result.current.panel as {
          props: { onPresetSelect: (meters: number) => void };
        }
      ).props.onPresetSelect(oneMile);
    });

    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBe(true);
    });

    expect(result.current.hud.mapOverlay).not.toBeNull();
    expect(result.current.hud.modeBody).toBeNull();

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    expect(result.current.draft.radarCenter).toEqual([53.35, -6.26]);
    expect(result.current.hud.suppressSheet).toBe(true);
  });
});
