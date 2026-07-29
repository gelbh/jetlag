import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeocodedPlace } from "../../services/geo/geocoding";
import { usePlaceAreaSearch } from "./usePlaceAreaSearch";

const searchPlaces = vi.hoisted(() => vi.fn());

vi.mock("../../services/geo/geocoding", () => ({
  searchPlaces,
}));

vi.mock("../../services/core/location/geolocation", () => ({
  getCurrentPosition: vi.fn(async () => {
    throw new Error("no gps");
  }),
}));

function place(id: string, displayName: string, lat: number, lng: number): GeocodedPlace {
  return {
    id,
    displayName,
    center: [lat, lng],
    bounds: {
      south: lat - 0.1,
      west: lng - 0.1,
      north: lat + 0.1,
      east: lng + 0.1,
    },
    placeCategory: "city",
    approximateAreaSqMi: 10,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("usePlaceAreaSearch", () => {
  beforeEach(() => {
    searchPlaces.mockReset();
  });

  it("ignores stale search results when a newer search finishes first", async () => {
    const first = deferred<GeocodedPlace[]>();
    const second = deferred<GeocodedPlace[]>();
    searchPlaces
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const { result } = renderHook(() => usePlaceAreaSearch());

    act(() => {
      result.current.setLocationQuery("Dublin");
    });

    let firstSearch!: Promise<void>;
    act(() => {
      firstSearch = result.current.handleSearch();
    });

    act(() => {
      result.current.setLocationQuery("Cork");
    });

    let secondSearch!: Promise<void>;
    act(() => {
      secondSearch = result.current.handleSearch();
    });

    await act(async () => {
      second.resolve([place("cork", "Cork", 51.9, -8.5)]);
      await secondSearch;
    });

    await act(async () => {
      first.resolve([place("dublin", "Dublin", 53.35, -6.26)]);
      await firstSearch;
    });

    expect(result.current.selectedPlace?.id).toBe("cork");
    expect(result.current.searchLoading).toBe(false);
  });
});
