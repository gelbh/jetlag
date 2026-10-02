import { afterEach, describe, expect, it } from "vitest";
import {
  clearPersistedLocationAccessConfirmed,
  hasPersistedLocationAccessConfirmed,
  LOCATION_ACCESS_CONFIRMED_STORAGE_KEY,
  persistLocationAccessConfirmed,
  resetLocationPermissionUiForTests,
} from "./locationPermissionUi";

describe("locationPermissionUi persistence", () => {
  afterEach(() => {
    resetLocationPermissionUiForTests();
  });

  it("starts without a persisted confirmation", () => {
    expect(hasPersistedLocationAccessConfirmed()).toBe(false);
  });

  it("persist writes the storage flag and clear removes it", () => {
    persistLocationAccessConfirmed();
    expect(localStorage.getItem(LOCATION_ACCESS_CONFIRMED_STORAGE_KEY)).toBe("1");
    expect(hasPersistedLocationAccessConfirmed()).toBe(true);

    clearPersistedLocationAccessConfirmed();
    expect(localStorage.getItem(LOCATION_ACCESS_CONFIRMED_STORAGE_KEY)).toBeNull();
    expect(hasPersistedLocationAccessConfirmed()).toBe(false);
  });

  it("resetLocationPermissionUiForTests clears the storage flag", () => {
    persistLocationAccessConfirmed();
    resetLocationPermissionUiForTests();
    expect(hasPersistedLocationAccessConfirmed()).toBe(false);
  });
});
