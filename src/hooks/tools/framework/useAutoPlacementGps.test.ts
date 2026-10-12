import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GeolocationPermissionState } from "../../../services/core/location/geolocation";
import { useAutoPlacementGps } from "./useAutoPlacementGps";

const permission = vi.hoisted(() => ({
  resolve: (_state: GeolocationPermissionState) => {},
}));

vi.mock("../../../services/core/location/geolocation", () => ({
  queryGeolocationPermission: () =>
    new Promise<GeolocationPermissionState>((resolve) => {
      permission.resolve = resolve;
    }),
}));

describe("useAutoPlacementGps", () => {
  const requestGps = vi.fn(async (_shouldApply: () => boolean) => undefined);

  beforeEach(() => {
    requestGps.mockClear();
  });

  it("requests GPS once per entry key when permission is granted", async () => {
    const { result, rerender } = renderHook(
      ({ entryKey }) =>
        useAutoPlacementGps({ eligible: true, entryKey, hasPoint: false, requestGps }),
      { initialProps: { entryKey: "a" } },
    );
    expect(result.current).toBe("checking");

    await act(async () => permission.resolve("granted"));
    expect(result.current).toBe("granted");
    expect(requestGps).toHaveBeenCalledTimes(1);

    rerender({ entryKey: "b" });
    await act(async () => permission.resolve("granted"));
    expect(requestGps).toHaveBeenCalledTimes(2);
  });

  it("does not override a point placed while permission was being checked", async () => {
    const { rerender } = renderHook(
      ({ hasPoint }) =>
        useAutoPlacementGps({ eligible: true, entryKey: "a", hasPoint, requestGps }),
      { initialProps: { hasPoint: false } },
    );

    rerender({ hasPoint: true });
    await act(async () => permission.resolve("granted"));

    expect(requestGps).not.toHaveBeenCalled();
  });

  it("lets a point placed while GPS is resolving win", async () => {
    const { rerender } = renderHook(
      ({ hasPoint }) =>
        useAutoPlacementGps({ eligible: true, entryKey: "a", hasPoint, requestGps }),
      { initialProps: { hasPoint: false } },
    );

    await act(async () => permission.resolve("granted"));
    const shouldApply = requestGps.mock.calls[0]?.[0];
    expect(shouldApply?.()).toBe(true);

    rerender({ hasPoint: true });
    expect(shouldApply?.()).toBe(false);
  });

  it("reports checking and skips GPS while not eligible", () => {
    const { result } = renderHook(() =>
      useAutoPlacementGps({ eligible: false, entryKey: "a", hasPoint: false, requestGps }),
    );

    expect(result.current).toBe("checking");
    expect(requestGps).not.toHaveBeenCalled();
  });
});
