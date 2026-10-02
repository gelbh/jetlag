type LocationPermissionUiSnapshot = {
  demand: number;
  confirmEpoch: number;
};

let locationPermissionDemand = 0;
let locationAccessConfirmEpoch = 0;
let locationPermissionUiSnapshot: LocationPermissionUiSnapshot = {
  demand: 0,
  confirmEpoch: 0,
};
const locationPermissionUiListeners = new Set<() => void>();

function emitLocationPermissionUi(): void {
  locationPermissionUiSnapshot = {
    demand: locationPermissionDemand,
    confirmEpoch: locationAccessConfirmEpoch,
  };
  for (const listener of locationPermissionUiListeners) {
    listener();
  }
}

export function getLocationPermissionUiSnapshot(): LocationPermissionUiSnapshot {
  return locationPermissionUiSnapshot;
}

export function subscribeLocationPermissionUi(onStoreChange: () => void): () => void {
  locationPermissionUiListeners.add(onStoreChange);
  return () => {
    locationPermissionUiListeners.delete(onStoreChange);
  };
}

/** Register that a live feature wants GPS. Banner watches aggregate demand. */
export function retainLocationPermissionDemand(): () => void {
  locationPermissionDemand += 1;
  emitLocationPermissionUi();
  return () => {
    locationPermissionDemand = Math.max(0, locationPermissionDemand - 1);
    emitLocationPermissionUi();
  };
}

/** Call only after a successful user-gesture grant for live map GPS. */
export function markLocationAccessConfirmed(): void {
  locationAccessConfirmEpoch += 1;
  emitLocationPermissionUi();
}

export const LOCATION_ACCESS_CONFIRMED_STORAGE_KEY = "jetlag.locationAccessConfirmed";

export function hasPersistedLocationAccessConfirmed(): boolean {
  try {
    return localStorage.getItem(LOCATION_ACCESS_CONFIRMED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistLocationAccessConfirmed(): void {
  try {
    localStorage.setItem(LOCATION_ACCESS_CONFIRMED_STORAGE_KEY, "1");
  } catch {
    // private mode / blocked storage
  }
}

export function clearPersistedLocationAccessConfirmed(): void {
  try {
    localStorage.removeItem(LOCATION_ACCESS_CONFIRMED_STORAGE_KEY);
  } catch {
    // private mode / blocked storage
  }
}

/** Test-only reset for demand / confirm epoch. */
export function resetLocationPermissionUiForTests(): void {
  locationPermissionDemand = 0;
  locationAccessConfirmEpoch = 0;
  locationPermissionUiSnapshot = { demand: 0, confirmEpoch: 0 };
  emitLocationPermissionUi();
  clearPersistedLocationAccessConfirmed();
}
