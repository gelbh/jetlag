import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMockGeolocationPosition,
  mockGeolocation,
} from "../../test/mocks/geolocation";
import * as geolocation from "../../services/core/location/geolocation";
import {
  confirmAndRequestLocationAccess,
  type GeolocationReading,
} from "../../services/core/location/geolocation";
import { resetLocationPermissionUiForTests } from "../../services/core/location/locationPermissionUi";
import {
  getLiveLocationReadingSnapshot,
  resetLiveLocationReadingForTests,
} from "../../services/core/location/liveLocationReading";
import { useLiveLocation } from "./useLiveLocation";

function mockPermissions(state: PermissionState): void {
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: {
      query: vi.fn(async () => ({ state })),
    },
  });
}

describe("useLiveLocation", () => {
  afterEach(() => {
    resetLocationPermissionUiForTests();
    resetLiveLocationReadingForTests();
    vi.unstubAllGlobals();
  });

  it("publishes live snapshot when a reading arrives", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("granted");

    renderHook(() => useLiveLocation(true));

    await waitFor(() => {
      expect(getLiveLocationReadingSnapshot().reading).toEqual({
        lat: 53.35,
        lng: -6.26,
        accuracy: 5,
        heading: null,
      });
    });
  });

  it("clears live snapshot when disabled", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("granted");

    const { rerender } = renderHook(
      ({ enabled }) => useLiveLocation(enabled),
      { initialProps: { enabled: true } },
    );

    await waitFor(() => {
      expect(getLiveLocationReadingSnapshot().reading).not.toBeNull();
    });

    rerender({ enabled: false });

    await waitFor(() => {
      expect(getLiveLocationReadingSnapshot().reading).toBeNull();
    });
  });

  it("publishes an initial reading when enabled and granted", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("granted");

    const { result } = renderHook(() => useLiveLocation(true));

    await waitFor(() => {
      expect(result.current.reading).toEqual({
        lat: 53.35,
        lng: -6.26,
        accuracy: 5,
        heading: null,
      });
    });
    expect(result.current.needsPermissionPrompt).toBe(false);
  });

  it("returns null readings when disabled", () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("granted");

    const { result } = renderHook(() => useLiveLocation(false));

    expect(result.current.reading).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.needsPermissionPrompt).toBe(false);
  });

  it("starts watching when enabled flips from false to true", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("granted");
    const watchPosition = vi.mocked(navigator.geolocation.watchPosition);

    const { result, rerender } = renderHook(
      ({ enabled }) => useLiveLocation(enabled),
      { initialProps: { enabled: false } },
    );

    expect(result.current.reading).toBeNull();
    expect(watchPosition).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => {
      expect(result.current.reading).toEqual({
        lat: 53.35,
        lng: -6.26,
        accuracy: 5,
        heading: null,
      });
    });
    expect(watchPosition).toHaveBeenCalled();
  });

  it("does not call geolocation while permission is prompt until confirm", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("prompt");
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);
    const watchPosition = vi.mocked(navigator.geolocation.watchPosition);

    const { result } = renderHook(() => useLiveLocation(true));

    await waitFor(() => {
      expect(result.current.needsPermissionPrompt).toBe(true);
    });

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(watchPosition).not.toHaveBeenCalled();
    expect(result.current.reading).toBeNull();
    expect(result.current.error).toBeNull();

    await act(async () => {
      await confirmAndRequestLocationAccess({ highAccuracy: false });
    });

    await waitFor(() => {
      expect(result.current.needsPermissionPrompt).toBe(false);
    });
    expect(getCurrentPosition).toHaveBeenCalled();
    expect(watchPosition).toHaveBeenCalled();
  });

  it("publishes the restored reading before watching", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("prompt");
    const restoredReading: GeolocationReading = {
      lat: 53.35,
      lng: -6.26,
      accuracy: 5,
      heading: null,
    };
    const restoreSpy = vi
      .spyOn(geolocation, "restoreLocationAccessIfPersisted")
      .mockResolvedValue({
        status: "restored",
        reading: restoredReading,
      });
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);
    const watchPosition = vi.mocked(navigator.geolocation.watchPosition);
    watchPosition.mockImplementation(() => 1);

    const { result } = renderHook(() => useLiveLocation(true));

    await waitFor(() => {
      expect(result.current.needsPermissionPrompt).toBe(false);
      expect(result.current.reading).toEqual({
        lat: 53.35,
        lng: -6.26,
        accuracy: 5,
        heading: null,
      });
    });

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(watchPosition).toHaveBeenCalled();

    restoreSpy.mockRestore();
  });

  it("stores an error when permission is denied without watching", async () => {
    mockGeolocation(null);
    mockPermissions("denied");
    const watchPosition = vi.mocked(navigator.geolocation.watchPosition);

    const { result } = renderHook(() => useLiveLocation(true));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    expect(result.current.needsPermissionPrompt).toBe(false);
    expect(watchPosition).not.toHaveBeenCalled();
  });

  it("throttles rapid watch updates that barely move", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success(createMockGeolocationPosition(53.35, -6.26));
    });

    const watchPosition = vi.fn((success: PositionCallback) => {
      success(createMockGeolocationPosition(53.35001, -6.26001));
      return 1;
    });

    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: {
        getCurrentPosition,
        watchPosition,
        clearWatch: vi.fn(),
      },
      permissions: {
        query: vi.fn(async () => ({ state: "granted" as PermissionState })),
      },
    });

    const { result } = renderHook(() =>
      useLiveLocation(true, { minIntervalMs: 60_000, minDistanceMeters: 100 }),
    );

    await waitFor(() => {
      expect(result.current.reading?.lat).toBe(53.35);
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(result.current.reading?.lat).toBe(53.35);
  });
});
