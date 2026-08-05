import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { PoiCandidate } from "@/domain/geo/poiCandidate";
import { usePoiCandidates } from "./usePoiCandidates";

function tileCandidate(name: string): PoiCandidate {
  return {
    id: `tile-${name}`,
    name,
    point: [51.5, -0.1],
    categoryId: "museum",
    source: "tile",
    confirmStatus: "provisional",
  };
}

function confirmedCandidate(name: string): PoiCandidate {
  return {
    id: `osm-${name}`,
    name,
    point: [51.5, -0.1],
    categoryId: "museum",
    source: "overpass",
    confirmStatus: "confirmed",
    osmId: "1",
  };
}

describe("usePoiCandidates", () => {
  const map = {} as MapLibreMap;

  it("street: shows provisional before confirm resolves", async () => {
    const queryPois = vi.fn(() => [tileCandidate("British Museum")]);
    const isTileQueryAvailable = vi.fn(() => true);
    let resolveConfirm!: (value: PoiCandidate[]) => void;
    const confirm = vi.fn(
      () =>
        new Promise<PoiCandidate[]>((resolve) => {
          resolveConfirm = resolve;
        }),
    );

    const { result } = renderHook(() =>
      usePoiCandidates({
        map,
        mapStyle: "standard",
        categoryId: "museum",
        confirm,
        enabled: true,
        queryPois,
        isTileQueryAvailable,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("preview");
    });
    expect(result.current.provisional).toHaveLength(1);
    expect(result.current.provisional[0].name).toBe("British Museum");
    expect(result.current.confirmed).toEqual([]);
    expect(queryPois).toHaveBeenCalled();

    await act(async () => {
      resolveConfirm([confirmedCandidate("British Museum")]);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    expect(result.current.confirmed).toHaveLength(1);
    expect(result.current.candidates[0].confirmStatus).toBe("confirmed");
  });

  it("satellite: no provisional tile query", async () => {
    const queryPois = vi.fn(() => [tileCandidate("Should Not Appear")]);
    const isTileQueryAvailable = vi.fn(() => false);
    const confirm = vi.fn(async () => [confirmedCandidate("Hospital")]);

    const { result } = renderHook(() =>
      usePoiCandidates({
        map,
        mapStyle: "satellite",
        categoryId: "hospital",
        confirm,
        enabled: true,
        queryPois,
        isTileQueryAvailable,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    expect(queryPois).not.toHaveBeenCalled();
    expect(result.current.provisional).toEqual([]);
    expect(result.current.confirmed).toHaveLength(1);
  });

  it("ignores stale confirm when a newer refresh starts", async () => {
    const queryPois = vi.fn(() => [] as PoiCandidate[]);
    const isTileQueryAvailable = vi.fn(() => true);
    const resolvers: Array<(value: PoiCandidate[]) => void> = [];
    const confirm = vi.fn(
      () =>
        new Promise<PoiCandidate[]>((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const { result } = renderHook(() =>
      usePoiCandidates({
        map,
        mapStyle: "standard",
        categoryId: "museum",
        confirm,
        enabled: true,
        queryPois,
        isTileQueryAvailable,
      }),
    );

    await waitFor(() => {
      expect(confirm).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(confirm).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      resolvers[0]!([confirmedCandidate("Stale")]);
      resolvers[1]!([confirmedCandidate("Fresh")]);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
    expect(result.current.confirmed[0]?.name).toBe("Fresh");
  });
});
