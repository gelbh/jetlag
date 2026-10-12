import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { milesToMeters } from "../../domain/map/distance";
import {
  type GeolocationReading,
  queryGeolocationPermission,
} from "../../services/core/location/geolocation";
import { useMapStore } from "../../state/mapStore";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import { useRadarTool } from "./useRadarTool";

vi.mock("../../services/core/location/geolocation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/core/location/geolocation")>();
  return {
    ...actual,
    queryGeolocationPermission: vi.fn(async () => "prompt" as const),
  };
});

describe("useRadarTool map-first", () => {
  beforeEach(() => {
    useMapStore.getState().setActiveTool("radar");
  });

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

  it("re-pins on map tap while answering and clears solo answer", async () => {
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
        awaitHiderAnswer: false,
      }),
    );

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

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    expect(result.current.draft.radarCenter).toEqual([53.35, -6.26]);

    act(() => {
      (
        result.current.panel as {
          props: { onAnswerChange: (answer: "yes" | "no") => void };
        }
      ).props.onAnswerChange("yes");
    });

    expect(result.current.draft.radarAnswer).toBe("yes");

    let accepted = false;
    act(() => {
      accepted = result.current.handleMapClick([53.36, -6.25]);
    });

    expect(accepted).toBe(true);
    expect(result.current.draft.radarCenter).toEqual([53.36, -6.25]);
    expect(result.current.draft.radarAnswer).toBeNull();
  });

  it("keeps a map tap made while the auto GPS fix is loading", async () => {
    vi.mocked(queryGeolocationPermission).mockResolvedValueOnce("granted");
    let resolveGps: (reading: GeolocationReading) => void = () => {};
    const refreshGps = vi.fn(
      () =>
        new Promise<GeolocationReading>((resolve) => {
          resolveGps = resolve;
        }),
    );
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
        refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
        armPlacement: vi.fn(),
        awaitHiderAnswer: true,
      }),
    );

    act(() => {
      (
        result.current.panel as {
          props: { onPresetSelect: (meters: number) => void };
        }
      ).props.onPresetSelect(milesToMeters(1));
    });
    await waitFor(() => {
      expect(refreshGps).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });
    await act(async () => {
      resolveGps({ lat: 53.4, lng: -6.3, accuracy: 5, heading: null });
    });

    expect(result.current.draft.radarCenter).toEqual([53.35, -6.26]);
  });
});
