import { markLocationAccessConfirmed } from "./locationPermissionUi";

export interface GeolocationReading {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
}

export type GeolocationPermissionState =
  | "prompt"
  | "granted"
  | "denied"
  | "unavailable";

export const LOCATION_BLOCKED_MESSAGE =
  "Location sharing is blocked. Allow location access in your browser settings.";

export const LOCATION_PERMISSION_REQUIRED_MESSAGE =
  "Allow location access to share your position with teammates and use GPS tools.";

export class GeolocationPermissionRequiredError extends Error {
  readonly code = "permission_required" as const;

  constructor(message = LOCATION_PERMISSION_REQUIRED_MESSAGE) {
    super(message);
    this.name = "GeolocationPermissionRequiredError";
  }
}

function readPosition(position: GeolocationPosition): GeolocationReading {
  const { latitude, longitude, accuracy, heading } = position.coords;

  return {
    lat: latitude,
    lng: longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    heading:
      typeof heading === "number" && Number.isFinite(heading) && heading >= 0
        ? heading
        : null,
  };
}

export function unknownGeolocationErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "GPS location unavailable.";
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return LOCATION_BLOCKED_MESSAGE;
    case error.POSITION_UNAVAILABLE:
      return "Current location is unavailable.";
    case error.TIMEOUT:
      return "Timed out while waiting for your location.";
    default:
      return error.message || "GPS location unavailable.";
  }
}

export async function queryGeolocationPermission(): Promise<GeolocationPermissionState> {
  if (!("geolocation" in navigator)) {
    return "unavailable";
  }

  if ("permissions" in navigator) {
    try {
      const status = await navigator.permissions.query({
        name: "geolocation",
      });
      if (
        status.state === "granted" ||
        status.state === "denied" ||
        status.state === "prompt"
      ) {
        return status.state;
      }
    } catch {
      // Permissions API missing/unsupported for geolocation — infer carefully below.
    }
  }

  // Without Permissions API, unknown is not denied. Treat as prompt so callers
  // still show an in-app reason before triggering the system dialog.
  return "prompt";
}

export function getCurrentPosition(options?: {
  highAccuracy?: boolean;
  /** Cached reading age; `0` forces a fresh sample (walk / e2e). */
  maximumAge?: number;
}): Promise<GeolocationReading> {
  const highAccuracy = options?.highAccuracy ?? true;
  const maximumAge =
    options?.maximumAge ?? (highAccuracy ? 10_000 : 30_000);

  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not available on this device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(readPosition(position));
      },
      (error) => {
        reject(new Error(geolocationErrorMessage(error)));
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: 15_000,
        maximumAge,
      },
    );
  });
}

export async function requestLocationAccess(options?: {
  highAccuracy?: boolean;
  maximumAge?: number;
  /** Required when permission state is `prompt` — call only from a user gesture. */
  userGesture?: boolean;
}): Promise<GeolocationReading> {
  const permission = await queryGeolocationPermission();

  if (permission === "unavailable") {
    throw new Error("Geolocation is not available on this device.");
  }

  if (permission === "denied") {
    throw new Error(LOCATION_BLOCKED_MESSAGE);
  }

  if (permission === "prompt" && !options?.userGesture) {
    throw new GeolocationPermissionRequiredError();
  }

  return getCurrentPosition(options);
}

/**
 * Map Allow CTA helper: system prompt under a user gesture, then marks live-map
 * GPS as confirmed so watches may start without re-prompting in-app.
 */
export async function confirmAndRequestLocationAccess(options?: {
  highAccuracy?: boolean;
}): Promise<GeolocationReading> {
  const reading = await requestLocationAccess({
    ...options,
    userGesture: true,
  });
  markLocationAccessConfirmed();
  return reading;
}

export function watchPosition(
  onUpdate: (reading: GeolocationReading) => void,
  onError: (error: Error) => void,
  options?: {
    highAccuracy?: boolean;
    maximumAge?: number;
  },
): () => void {
  const highAccuracy = options?.highAccuracy ?? true;
  const maximumAge =
    options?.maximumAge ?? (highAccuracy ? 5_000 : 20_000);
  if (!("geolocation" in navigator)) {
    onError(new Error("Geolocation is not available on this device."));
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onUpdate(readPosition(position));
    },
    (error) => {
      onError(new Error(geolocationErrorMessage(error)));
    },
    {
      enableHighAccuracy: highAccuracy,
      maximumAge,
    },
  );

  return () => {
    navigator.geolocation?.clearWatch?.(watchId);
  };
}
