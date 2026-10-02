import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { Feature, LineString } from "geojson";
import { useMeasuringAnchorLoaders } from "./useMeasuringAnchorLoaders";
import { useMeasuringDraftState } from "./useMeasuringDraftState";
import { registerMapLibreMap } from "@/services/geo/maplibre/mapLibreMapRegistry";
import { useMapStore } from "@/state/mapStore";
import { fetchMeasuringPlacesInArea } from "@/services/geo/overpass/measuringPlaces";
import { resolveCoastlineContextFromCache } from "@/services/geo/overpass/coastline";
import { fetchMeasuringCoastlineContext } from "../measuringToolResolvers";

vi.mock("@/services/geo/overpass/measuringPlaces", () => ({
  fetchMeasuringPlacesInArea: vi.fn(),
  measuringPlaceNotFoundMessage: () => "No places",
}));

vi.mock("@/services/geo/overpass/coastline", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/geo/overpass/coastline")>();
  return {
    ...actual,
    resolveCoastlineContextFromCache: vi.fn(),
  };
});

vi.mock("../measuringToolResolvers", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../measuringToolResolvers")>();
  return {
    ...actual,
    fetchMeasuringCoastlineContext: vi.fn(),
  };
});

const fetchMock = vi.mocked(fetchMeasuringPlacesInArea);
const resolveCoastlineCacheMock = vi.mocked(resolveCoastlineContextFromCache);
const fetchCoastlineMock = vi.mocked(fetchMeasuringCoastlineContext);

const dublinishArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.4, 53.3],
      [-6.2, 53.3],
      [-6.2, 53.4],
      [-6.4, 53.4],
      [-6.4, 53.3],
    ],
  ],
} as const;

const packCoastSegment: Feature<LineString> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: [
      [-6.38, 53.32],
      [-6.3, 53.33],
    ],
  },
};

describe("useMeasuringAnchorLoaders tile preview", () => {
  beforeEach(() => {
    useMapStore.setState({ mapStyle: "standard" });
    fetchMock.mockReset();
    resolveCoastlineCacheMock.mockReset();
    fetchCoastlineMock.mockReset();
    registerMapLibreMap({
      getStyle: () => ({
        sources: { openmaptiles: {} },
        layers: [],
      }),
      querySourceFeatures: () => [
        {
          type: "Feature",
          id: 9,
          properties: { name: "Tile Museum", class: "museum" },
          geometry: { type: "Point", coordinates: [-0.1, 51.5] },
        },
      ],
    } as never);
  });

  it("shows tile provisional places then upgrades to confirmed", async () => {
    let resolveConfirm!: (places: Array<{
      id: string;
      name: string;
      point: [number, number];
    }>) => void;
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConfirm = resolve;
        }),
    );

    const gameArea = {
      type: "Polygon",
      coordinates: [
        [
          [-0.2, 51.4],
          [-0.2, 51.6],
          [0, 51.6],
          [0, 51.4],
          [-0.2, 51.4],
        ],
      ],
    } as const;

    const { result } = renderHook(() => {
      const draft = useMeasuringDraftState([]);
      const loaders = useMeasuringAnchorLoaders({
        active: true,
        gameArea: gameArea as never,
        setMapError: vi.fn(),
        draft,
      });
      return { draft, loaders };
    });

    let loadPromise!: Promise<void>;
    act(() => {
      loadPromise = result.current.loaders.loadAllPlacesAt(
        [51.5, -0.1],
        "museum",
      );
    });

    await waitFor(() => {
      expect(result.current.draft.measuringPlaces[0]?.name).toBe("Tile Museum");
      expect(result.current.draft.measuringPlaces[0]?.confirmStatus).toBe(
        "provisional",
      );
    });

    await act(async () => {
      resolveConfirm([
        {
          id: "osm:confirmed",
          name: "Confirmed Museum",
          point: [51.501, -0.1],
        },
      ]);
      await loadPromise;
    });

    expect(result.current.draft.measuringPlaces[0]?.name).toBe(
      "Confirmed Museum",
    );
    expect(
      result.current.draft.measuringPlaces[0]?.confirmStatus !== "provisional",
    ).toBe(true);
  });
});

describe("useMeasuringAnchorLoaders coastline pack seed", () => {
  beforeEach(() => {
    resolveCoastlineCacheMock.mockReset();
    fetchCoastlineMock.mockReset();
  });

  it("seeds draft coastline segments from pack before Overpass enrich lands", async () => {
    resolveCoastlineCacheMock.mockReturnValue(null);
    fetchCoastlineMock.mockResolvedValue({
      ok: true,
      coastPoint: [53.33, -6.34],
      distanceMeters: 1_200,
      segments: [packCoastSegment],
    });

    const { result } = renderHook(() => {
      const draft = useMeasuringDraftState([]);
      const loaders = useMeasuringAnchorLoaders({
        active: true,
        gameArea: dublinishArea as never,
        setMapError: vi.fn(),
        draft,
        sessionRules: { regionPackId: "dublin" } as never,
      });
      return { draft, loaders };
    });

    act(() => {
      result.current.draft.setMeasuringSubject("coastline");
      result.current.draft.setMeasuringOptionChosen(true);
    });

    await act(async () => {
      await result.current.loaders.loadMeasuringCoastlineAt([53.35, -6.26]);
    });

    expect(result.current.draft.measuringCoastSegments).toEqual([
      packCoastSegment,
    ]);
    expect(result.current.draft.measuringLoading).toBe(false);
  });

  it("clears stale coastline geometry as soon as re-resolve starts", async () => {
    resolveCoastlineCacheMock.mockReturnValue(null);
    let resolveFetch!: (value: {
      ok: true;
      coastPoint: [number, number];
      distanceMeters: number;
      segments: Feature<LineString>[];
    }) => void;
    fetchCoastlineMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { result } = renderHook(() => {
      const draft = useMeasuringDraftState([]);
      const loaders = useMeasuringAnchorLoaders({
        active: true,
        gameArea: dublinishArea as never,
        setMapError: vi.fn(),
        draft,
        sessionRules: { regionPackId: "dublin" } as never,
      });
      return { draft, loaders };
    });

    act(() => {
      result.current.draft.setMeasuringSubject("coastline");
      result.current.draft.setMeasuringOptionChosen(true);
      result.current.draft.setMeasuringTargetPoint([53.33, -6.34]);
      result.current.draft.setMeasuringDistanceMeters(1_200);
      result.current.draft.setMeasuringCoastSegments([packCoastSegment]);
    });

    let loadPromise!: Promise<void>;
    act(() => {
      loadPromise = result.current.loaders.loadMeasuringCoastlineAt([
        53.35, -6.26,
      ]);
    });

    expect(result.current.draft.measuringLoading).toBe(true);
    expect(result.current.draft.measuringTargetPoint).toBeNull();
    expect(result.current.draft.measuringDistanceMeters).toBeNull();
    expect(result.current.draft.measuringCoastSegments).toEqual([]);

    await act(async () => {
      resolveFetch({
        ok: true,
        coastPoint: [53.34, -6.3],
        distanceMeters: 800,
        segments: [packCoastSegment],
      });
      await loadPromise;
    });

    expect(result.current.draft.measuringLoading).toBe(false);
    expect(result.current.draft.measuringCoastSegments).toEqual([
      packCoastSegment,
    ]);
  });
});
