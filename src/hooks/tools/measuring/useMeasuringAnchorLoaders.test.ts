import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMeasuringAnchorLoaders } from "./useMeasuringAnchorLoaders";
import { useMeasuringDraftState } from "./useMeasuringDraftState";
import { registerMapLibreMap } from "@/services/geo/maplibre/mapLibreMapRegistry";
import { useMapStore } from "@/state/mapStore";
import { fetchMeasuringPlacesInArea } from "@/services/geo/overpass/measuringPlaces";

vi.mock("@/services/geo/overpass/measuringPlaces", () => ({
  fetchMeasuringPlacesInArea: vi.fn(),
  measuringPlaceNotFoundMessage: () => "No places",
}));

const fetchMock = vi.mocked(fetchMeasuringPlacesInArea);

describe("useMeasuringAnchorLoaders tile preview", () => {
  beforeEach(() => {
    useMapStore.setState({ mapStyle: "standard" });
    fetchMock.mockReset();
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
