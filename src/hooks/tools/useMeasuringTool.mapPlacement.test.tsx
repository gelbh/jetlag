import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as previewBasemapPoisModule from "@/services/geo/maplibre/previewBasemapPois";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import { useMeasuringTool } from "./useMeasuringTool";

vi.mock("../../services/core/location/geolocation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/core/location/geolocation")>();
  return {
    ...actual,
    queryGeolocationPermission: vi.fn(async () => "prompt" as const),
  };
});

vi.mock("../../services/geo/overpass/coastline", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/geo/overpass/coastline")>();
  return {
    ...actual,
    resolveCoastlineContextFromCache: vi.fn(() => null),
  };
});

vi.mock("./measuringToolResolvers", () => ({
  fetchMeasuringCoastlineContext: vi.fn(async () => ({
    ok: true as const,
    coastPoint: [53.34, -6.27] as [number, number],
    distanceMeters: 1200,
    segments: [
      {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [-6.27, 53.34],
            [-6.26, 53.35],
          ],
        },
      },
    ],
  })),
  fetchMeasuringLinearContext: vi.fn(async () => ({
    ok: false as const,
    message: "unused",
  })),
  fetchMeasuringMapTarget: vi.fn(async () => ({
    ok: false as const,
    message: "unused",
  })),
  fetchMeasuringSeaLevelContext: vi.fn(async () => ({
    ok: false as const,
    message: "unused",
  })),
  fetchNearestMeasuringPlace: vi.fn(async () => ({
    ok: false as const,
    message: "unused",
  })),
}));

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
          props: {
            model: { onMeasureFromChange: (kind: string) => void };
          };
        }
      ).props.model.onMeasureFromChange("train_station");
    });

    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBe(true);
    });

    expect(result.current.hud.mapOverlay).not.toBeNull();
    expect(result.current.hud.modeBody).toBeNull();
  });

  it("re-pins seeker on map tap while answering and clears answer", async () => {
    vi.spyOn(previewBasemapPoisModule, "previewBasemapPois").mockReturnValue([]);

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
        awaitHiderAnswer: false,
      }),
    );

    act(() => {
      (
        result.current.hud.modeBody as {
          props: {
            model: { onMeasureFromChange: (kind: string) => void };
          };
        }
      ).props.model.onMeasureFromChange("coastline");
    });

    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBe(true);
    });

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    await waitFor(() => {
      expect(result.current.draft.measuringSeekerPoint).toEqual([53.35, -6.26]);
      expect(result.current.draft.measuringTargetPoint).toEqual([53.34, -6.27]);
      expect(result.current.draft.seekerResolving).toBe(false);
    });

    act(() => {
      (
        result.current.hud.mapOverlay as {
          props: { onAnswerChange: (answer: "closer" | "farther") => void };
        }
      ).props.onAnswerChange("closer");
    });

    await waitFor(() => {
      expect(
        (
          result.current.hud.mapOverlay as {
            props: { answer: "closer" | "farther" | null };
          }
        ).props.answer,
      ).toBe("closer");
    });

    const targetBeforeRepin = result.current.draft.measuringTargetPoint;
    let accepted = false;
    act(() => {
      accepted = result.current.handleMapClick([53.36, -6.25]);
    });

    expect(accepted).toBe(true);
    expect(result.current.draft.measuringSeekerPoint).toEqual([53.36, -6.25]);
    expect(
      (
        result.current.hud.mapOverlay as {
          props: { answer: "closer" | "farther" | null };
        }
      ).props.answer,
    ).toBeNull();
    // Seeker re-pin path clears target for re-resolve; must not treat ask tap as target-only.
    expect(result.current.draft.measuringTargetPoint).toBeNull();
    expect(targetBeforeRepin).toEqual([53.34, -6.27]);
  });
});
