import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMockGeolocationPosition,
  mockGeolocation,
} from "../../test/mocks/geolocation";
import {
  LIVE_LOCATION_FRESH_MS,
  publishLiveLocationReading,
  resetLiveLocationReadingForTests,
} from "../../services/core/location/liveLocationReading";
import { resetLocationPermissionUiForTests } from "../../services/core/location/locationPermissionUi";
import { useGeolocation } from "./useGeolocation";

function mockPermissions(state: PermissionState): void {
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: {
      query: vi.fn(async () => ({ state })),
    },
  });
}

describe("useGeolocation", () => {
  afterEach(() => {
    resetLiveLocationReadingForTests();
    resetLocationPermissionUiForTests();
    vi.unstubAllGlobals();
  });

  it("prefers a fresh live reading without calling geolocation", async () => {
    mockGeolocation(createMockGeolocationPosition(0, 0));
    mockPermissions("granted");
    publishLiveLocationReading(
      { lat: 53.35, lng: -6.26, accuracy: 5, heading: null },
      Date.now(),
    );
    const getCurrentPosition = vi.mocked(
      navigator.geolocation.getCurrentPosition,
    );

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      const reading = await result.current.refresh();
      expect(reading).toEqual({
        lat: 53.35,
        lng: -6.26,
        accuracy: 5,
        heading: null,
      });
    });

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(result.current.reading).toMatchObject({ lat: 53.35, lng: -6.26 });
  });

  it("falls back to coarse confirm when live reading is stale", async () => {
    mockGeolocation(createMockGeolocationPosition(51.5, -0.12));
    mockPermissions("granted");
    publishLiveLocationReading(
      { lat: 53.35, lng: -6.26, accuracy: 5, heading: null },
      Date.now() - LIVE_LOCATION_FRESH_MS - 1,
    );
    const getCurrentPosition = vi.mocked(
      navigator.geolocation.getCurrentPosition,
    );

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.refresh();
    });

    expect(getCurrentPosition).toHaveBeenCalled();
    const options = getCurrentPosition.mock.calls[0]?.[2] as
      | PositionOptions
      | undefined;
    expect(options?.enableHighAccuracy).toBe(false);
    expect(result.current.reading).toMatchObject({ lat: 51.5, lng: -0.12 });
  });

  it("returns a reading when geolocation succeeds", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("granted");

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.reading).toEqual({
      lat: 53.35,
      lng: -6.26,
      accuracy: 5,
      heading: null,
    });
  });

  it("stores an error when permission is denied", async () => {
    mockGeolocation(null);
    mockPermissions("denied");

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await expect(result.current.refresh()).rejects.toThrow();
    });

    expect(result.current.error).toBeTruthy();
  });
});
