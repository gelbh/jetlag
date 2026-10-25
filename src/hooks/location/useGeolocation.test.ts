import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LIVE_LOCATION_FRESH_MS,
  LIVE_WAIT_AFTER_TIMEOUT_MS,
  LIVE_WAIT_BEFORE_ONESHOT_MS,
  publishLiveLocationReading,
  releaseLiveLocationReading,
  resetLiveLocationReadingForTests,
  retainLiveLocationReading,
} from "../../services/core/location/liveLocationReading";
import {
  markLocationAccessConfirmed,
  persistLocationAccessConfirmed,
  resetLocationPermissionUiForTests,
} from "../../services/core/location/locationPermissionUi";
import { createMockGeolocationPosition, mockGeolocation } from "../../test/mocks/geolocation";
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
    vi.useRealTimers();
  });

  const dublinReading = {
    lat: 53.35,
    lng: -6.26,
    accuracy: 5,
    heading: null,
  };

  it("prefers a fresh live reading without calling geolocation", async () => {
    mockGeolocation(createMockGeolocationPosition(0, 0));
    mockPermissions("granted");
    publishLiveLocationReading({ lat: 53.35, lng: -6.26, accuracy: 5, heading: null }, Date.now());
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);

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
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.refresh();
    });

    expect(getCurrentPosition).toHaveBeenCalled();
    const options = getCurrentPosition.mock.calls[0]?.[2] as PositionOptions | undefined;
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

  it("does not wait when retainers exist but access is unconfirmed", async () => {
    retainLiveLocationReading();
    mockGeolocation(createMockGeolocationPosition(51.5, -0.12));
    mockPermissions("granted");
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.refresh();
    });

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(result.current.reading).toMatchObject({ lat: 51.5, lng: -0.12 });
    releaseLiveLocationReading();
  });

  it("waits for live publish before one-shot when retainers exist", async () => {
    retainLiveLocationReading();
    markLocationAccessConfirmed();
    mockGeolocation(createMockGeolocationPosition(51.5, -0.12));
    mockPermissions("granted");
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);

    const { result } = renderHook(() => useGeolocation());

    let refreshPromise: Promise<unknown>;
    await act(async () => {
      refreshPromise = result.current.refresh();
    });

    expect(getCurrentPosition).not.toHaveBeenCalled();

    await act(async () => {
      publishLiveLocationReading(dublinReading, Date.now());
    });

    await act(async () => {
      const reading = await refreshPromise;
      expect(reading).toEqual(dublinReading);
    });

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(result.current.reading).toEqual(dublinReading);
    releaseLiveLocationReading();
  });

  it("waits when retainers exist and access was persisted", async () => {
    retainLiveLocationReading();
    persistLocationAccessConfirmed();
    mockGeolocation(createMockGeolocationPosition(51.5, -0.12));
    mockPermissions("granted");
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);

    const { result } = renderHook(() => useGeolocation());

    let refreshPromise: Promise<unknown>;
    await act(async () => {
      refreshPromise = result.current.refresh();
    });

    expect(getCurrentPosition).not.toHaveBeenCalled();

    await act(async () => {
      publishLiveLocationReading(dublinReading, Date.now());
    });

    await act(async () => {
      const reading = await refreshPromise;
      expect(reading).toEqual(dublinReading);
    });

    expect(getCurrentPosition).not.toHaveBeenCalled();
    releaseLiveLocationReading();
  });

  it("falls through to one-shot after LIVE_WAIT_BEFORE_ONESHOT_MS with retainers", async () => {
    vi.useFakeTimers();
    retainLiveLocationReading();
    markLocationAccessConfirmed();
    mockGeolocation(createMockGeolocationPosition(51.5, -0.12));
    mockPermissions("granted");
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);

    const { result } = renderHook(() => useGeolocation());

    let refreshPromise: Promise<unknown>;
    await act(async () => {
      refreshPromise = result.current.refresh();
    });

    expect(getCurrentPosition).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_WAIT_BEFORE_ONESHOT_MS);
    });

    await act(async () => {
      await refreshPromise;
    });

    expect(getCurrentPosition).toHaveBeenCalled();
    expect(result.current.reading).toMatchObject({ lat: 51.5, lng: -0.12 });
    releaseLiveLocationReading();
  });

  it("does not wait when no retainers", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("granted");
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.refresh();
    });

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("soft-recovers from TIMEOUT when live publishes after pre-wait", async () => {
    vi.useFakeTimers();
    retainLiveLocationReading();
    markLocationAccessConfirmed();
    mockGeolocation(null, 3);
    mockPermissions("granted");

    const { result } = renderHook(() => useGeolocation());

    let refreshPromise: Promise<unknown>;
    await act(async () => {
      refreshPromise = result.current.refresh();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_WAIT_BEFORE_ONESHOT_MS);
    });

    await act(async () => {
      publishLiveLocationReading(dublinReading, Date.now());
    });

    await act(async () => {
      await refreshPromise;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.reading).toEqual(dublinReading);
    releaseLiveLocationReading();
  });

  it("surfaces timeout when soft-recover window also misses", async () => {
    vi.useFakeTimers();
    retainLiveLocationReading();
    markLocationAccessConfirmed();
    mockGeolocation(null, 3);
    mockPermissions("granted");

    const { result } = renderHook(() => useGeolocation());

    let refreshPromise!: Promise<unknown>;
    await act(async () => {
      refreshPromise = result.current.refresh();
    });

    const rejection = expect(refreshPromise).rejects.toThrow(/timed out/i);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_WAIT_BEFORE_ONESHOT_MS);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_WAIT_AFTER_TIMEOUT_MS);
    });

    await act(async () => {
      await rejection;
    });

    expect(result.current.error).toMatch(/timed out/i);
    releaseLiveLocationReading();
  });
});
