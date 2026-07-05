import { vi } from "vitest";

export function mockGeolocation(position: GeolocationPosition | null): void {
  const getCurrentPosition = vi.fn(
    (success: PositionCallback, error?: PositionErrorCallback) => {
      if (position) {
        success(position);
        return;
      }

      error?.({
        code: 1,
        message: "Permission denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
    },
  );

  const watchPosition = vi.fn(
    (success: PositionCallback, error?: PositionErrorCallback) => {
      getCurrentPosition(success, error);
      return 1;
    },
  );

  vi.stubGlobal("navigator", {
    ...navigator,
    geolocation: {
      getCurrentPosition,
      watchPosition,
      clearWatch: vi.fn(),
    },
  });
}

export function createMockGeolocationPosition(
  lat: number,
  lng: number,
): GeolocationPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy: 5,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: Date.now(),
    toJSON: () => ({}),
  };
}
