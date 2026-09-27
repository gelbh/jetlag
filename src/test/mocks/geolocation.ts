import { vi } from "vitest";

export function mockGeolocation(
  position: GeolocationPosition | null,
  errorCode: 1 | 2 | 3 = 1,
): void {
  const getCurrentPosition = vi.fn(
    (success: PositionCallback, error?: PositionErrorCallback) => {
      if (position) {
        success(position);
        return;
      }

      const messages: Record<1 | 2 | 3, string> = {
        1: "Permission denied",
        2: "Position unavailable",
        3: "Timeout",
      };

      error?.({
        code: errorCode,
        message: messages[errorCode],
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
