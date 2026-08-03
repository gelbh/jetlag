import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMockGeolocationPosition,
  mockGeolocation,
} from "../../test/mocks/geolocation";
import { resetLocationPermissionUiForTests } from "../../services/core/location/geolocation";
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
    resetLocationPermissionUiForTests();
    vi.unstubAllGlobals();
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
});
