import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createMockGeolocationPosition,
  mockGeolocation,
} from "../test/mocks/geolocation";
import { useLiveLocation } from "./useLiveLocation";

describe("useLiveLocation", () => {
  it("publishes an initial reading when enabled", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));

    const { result } = renderHook(() => useLiveLocation(true));

    await waitFor(() => {
      expect(result.current.reading).toEqual({
        lat: 53.35,
        lng: -6.26,
        accuracy: 5,
        heading: null,
      });
    });
  });

  it("returns null readings when disabled", () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));

    const { result } = renderHook(() => useLiveLocation(false));

    expect(result.current.reading).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("stores an error when permission is denied", async () => {
    mockGeolocation(null);

    const { result } = renderHook(() => useLiveLocation(true));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it("throttles rapid watch updates that barely move", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success(createMockGeolocationPosition(53.35, -6.26));
    });

    const watchPosition = vi.fn((success: PositionCallback) => {
      success(createMockGeolocationPosition(53.35001, -6.26001));
      return 1;
    });

    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: {
        getCurrentPosition,
        watchPosition,
        clearWatch: vi.fn(),
      },
    });

    const { result } = renderHook(() =>
      useLiveLocation(true, { minIntervalMs: 60_000, minDistanceMeters: 100 }),
    );

    await waitFor(() => {
      expect(result.current.reading?.lat).toBe(53.35);
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(result.current.reading?.lat).toBe(53.35);
  });
});
