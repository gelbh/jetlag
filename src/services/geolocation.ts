export interface GeolocationReading {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
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
    : "Unable to read GPS location.";
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location sharing is blocked. Allow location access in your browser settings.";
    case error.POSITION_UNAVAILABLE:
      return "Current location is unavailable.";
    case error.TIMEOUT:
      return "Timed out while waiting for your location.";
    default:
      return error.message || "Unable to read GPS location.";
  }
}

export function getCurrentPosition(): Promise<GeolocationReading> {
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
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 10_000,
      },
    );
  });
}

export async function requestLocationAccess(): Promise<GeolocationReading> {
  if ("permissions" in navigator) {
    try {
      const status = await navigator.permissions.query({
        name: "geolocation",
      });
      if (status.state === "denied") {
        throw new Error(
          "Location sharing is blocked. Allow location access in your browser settings.",
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("blocked")) {
        throw error;
      }
    }
  }

  return getCurrentPosition();
}

export function watchPosition(
  onUpdate: (reading: GeolocationReading) => void,
  onError: (error: Error) => void,
): () => void {
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
      enableHighAccuracy: true,
      maximumAge: 5_000,
    },
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}
