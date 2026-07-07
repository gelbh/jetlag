import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMockGeolocationPosition,
  mockGeolocation,
} from "../../test/mocks/geolocation";
import { useGeolocation } from "./useGeolocation";

describe("useGeolocation", () => {
  it("returns a reading when geolocation succeeds", async () => {
    mockGeolocation(createMockGeolocationPosition(53.35, -6.26));

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

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await expect(result.current.refresh()).rejects.toThrow();
    });

    expect(result.current.error).toBeTruthy();
  });
});
