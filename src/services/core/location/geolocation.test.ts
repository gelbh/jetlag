import { afterEach, describe, expect, it, vi } from "vitest";
import {
  confirmAndRequestLocationAccess,
  GeolocationPermissionRequiredError,
  LOCATION_BLOCKED_MESSAGE,
  queryGeolocationPermission,
  requestLocationAccess,
  resetLocationPermissionUiForTests,
} from "./geolocation";
import {
  createMockGeolocationPosition,
  mockGeolocation,
} from "../../../test/mocks/geolocation";

function mockPermissions(state: PermissionState | null): void {
  if (state === null) {
    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: navigator.geolocation,
      permissions: undefined,
    });
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

    await expect(
      confirmAndRequestLocationAccess({ highAccuracy: false }),
    ).resolves.toMatchObject({ lat: 53.35, lng: -6.26 });
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledOnce();
  });

  it("requestLocationAccess throws settings guidance when denied", async () => {
    mockGeolocation(null);
    mockPermissions("denied");

    await expect(requestLocationAccess({ userGesture: true })).rejects.toThrow(
      LOCATION_BLOCKED_MESSAGE,
    );
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it("requestLocationAccess proceeds when already granted", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));
    mockPermissions("granted");

    await expect(requestLocationAccess()).resolves.toMatchObject({
      lat: 53.35,
      lng: -6.26,
    });
  });
});
