import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockGeolocationPosition, mockGeolocation } from "@/test/mocks/geolocation";
import {
  confirmAndRequestLocationAccess,
  GeolocationPermissionRequiredError,
  LOCATION_BLOCKED_MESSAGE,
  queryGeolocationPermission,
  requestLocationAccess,
  restoreLocationAccessIfPersisted,
} from "./geolocation";
import {
  getLocationPermissionUiSnapshot,
  hasPersistedLocationAccessConfirmed,
  markLocationAccessConfirmed,
  persistLocationAccessConfirmed,
  resetLocationPermissionUiForTests,
} from "./locationPermissionUi";

function mockPermissions(state: PermissionState | null): void {
  if (state === null) {
    const stubbedNavigator: Record<string, unknown> = {
      ...navigator,
      geolocation: navigator.geolocation,
    };
    delete stubbedNavigator.permissions;
    vi.stubGlobal("navigator", stubbedNavigator);
    return;
  }

  vi.stubGlobal("navigator", {
    ...navigator,
    geolocation: navigator.geolocation,
    permissions: {
      query: vi.fn(async () => ({ state })),
    },
  });
}

describe("geolocation permission gating", () => {
  afterEach(() => {
    resetLocationPermissionUiForTests();
    vi.unstubAllGlobals();
  });

  it("queryGeolocationPermission returns Permissions API state", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("denied");

    await expect(queryGeolocationPermission()).resolves.toBe("denied");
  });

  it("queryGeolocationPermission treats missing Permissions API as prompt", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions(null);

    await expect(queryGeolocationPermission()).resolves.toBe("prompt");
  });

  it("requestLocationAccess does not call geolocation while prompt without gesture", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("prompt");
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);

    await expect(requestLocationAccess()).rejects.toBeInstanceOf(
      GeolocationPermissionRequiredError,
    );
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("confirmAndRequestLocationAccess requests position after user gesture", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("prompt");

    await expect(confirmAndRequestLocationAccess({ highAccuracy: false })).resolves.toMatchObject({
      lat: 53.35,
      lng: -6.26,
    });
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledOnce();
  });

  it("requestLocationAccess throws settings guidance when denied", async () => {
    mockGeolocation(null);
    mockPermissions("denied");

    await expect(requestLocationAccess({ userGesture: true })).rejects.toThrow(
      LOCATION_BLOCKED_MESSAGE,
    );
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledOnce();
  });

  it("requestLocationAccess with userGesture does not wait on Permissions API", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    const query = vi.fn(
      () =>
        new Promise<PermissionStatus>(() => {
          /* hang: iOS prompt must not wait on this */
        }),
    );
    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: navigator.geolocation,
      permissions: { query },
    });

    await expect(requestLocationAccess({ userGesture: true })).resolves.toMatchObject({
      lat: 53.35,
      lng: -6.26,
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("requestLocationAccess proceeds when already granted", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("granted");

    await expect(requestLocationAccess()).resolves.toMatchObject({
      lat: 53.35,
      lng: -6.26,
    });
  });

  it("confirmAndRequestLocationAccess persists the confirmation flag", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("prompt");

    await confirmAndRequestLocationAccess({ highAccuracy: false });

    expect(hasPersistedLocationAccessConfirmed()).toBe(true);
    expect(getLocationPermissionUiSnapshot().confirmEpoch).toBeGreaterThan(0);
  });

  it("restoreLocationAccessIfPersisted is a no-op without the flag", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("prompt");
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);

    await expect(restoreLocationAccessIfPersisted()).resolves.toEqual({
      status: "skipped",
    });
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(getLocationPermissionUiSnapshot().confirmEpoch).toBe(0);
  });

  it("restoreLocationAccessIfPersisted quiet-reads and marks confirm when flag is set", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("prompt");
    persistLocationAccessConfirmed();

    await expect(restoreLocationAccessIfPersisted({ highAccuracy: false })).resolves.toMatchObject({
      status: "restored",
      reading: { lat: 53.35, lng: -6.26 },
    });
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledOnce();
    expect(getLocationPermissionUiSnapshot().confirmEpoch).toBeGreaterThan(0);
  });

  it("restoreLocationAccessIfPersisted clears the flag when location is blocked", async () => {
    mockGeolocation(null);
    mockPermissions("prompt");
    persistLocationAccessConfirmed();

    await expect(restoreLocationAccessIfPersisted({ highAccuracy: false })).resolves.toEqual({
      status: "denied",
    });
    expect(hasPersistedLocationAccessConfirmed()).toBe(false);
    expect(getLocationPermissionUiSnapshot().confirmEpoch).toBe(0);
  });

  it("restoreLocationAccessIfPersisted skips without geolocation when already confirmed in session", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("prompt");
    persistLocationAccessConfirmed();
    markLocationAccessConfirmed();
    const getCurrentPosition = vi.mocked(navigator.geolocation.getCurrentPosition);

    await expect(restoreLocationAccessIfPersisted({ highAccuracy: false })).resolves.toEqual({
      status: "skipped",
    });
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(hasPersistedLocationAccessConfirmed()).toBe(true);
  });

  it.each([
    { errorCode: 2 as const, label: "POSITION_UNAVAILABLE" },
    { errorCode: 3 as const, label: "TIMEOUT" },
  ])(
    "restoreLocationAccessIfPersisted returns failed and keeps persist on $label",
    async ({ errorCode }) => {
      mockGeolocation(null, errorCode);
      mockPermissions("prompt");
      persistLocationAccessConfirmed();

      await expect(restoreLocationAccessIfPersisted({ highAccuracy: false })).resolves.toEqual({
        status: "failed",
      });
      expect(hasPersistedLocationAccessConfirmed()).toBe(true);
      expect(getLocationPermissionUiSnapshot().confirmEpoch).toBe(0);
    },
  );

  it("restoreLocationAccessIfPersisted shares one quiet read across concurrent callers", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success(createMockGeolocationPosition(53.35, -6.26));
    });

    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: {
        getCurrentPosition,
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
      permissions: {
        query: vi.fn(async () => ({ state: "prompt" as PermissionState })),
      },
    });
    persistLocationAccessConfirmed();

    const first = restoreLocationAccessIfPersisted({ highAccuracy: false });
    const second = restoreLocationAccessIfPersisted({ highAccuracy: false });

    await expect(first).resolves.toMatchObject({
      status: "restored",
      reading: { lat: 53.35, lng: -6.26 },
    });
    await expect(second).resolves.toMatchObject({
      status: "restored",
      reading: { lat: 53.35, lng: -6.26 },
    });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(getLocationPermissionUiSnapshot().confirmEpoch).toBeGreaterThan(0);
  });
});
