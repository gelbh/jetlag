import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useThermometerWalk } from "./useThermometerWalk";

const useLiveLocationMock = vi.hoisted(() =>
  vi.fn(() => ({
    reading: null as { lat: number; lng: number; accuracy: number } | null,
    error: null as string | null,
    needsPermissionPrompt: false,
    requestPermission: vi.fn(async () => undefined),
  })),
);

vi.mock("../location/useLiveLocation", () => ({
  useLiveLocation: useLiveLocationMock,
}));

describe("useThermometerWalk", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useLiveLocationMock.mockReset();
    useLiveLocationMock.mockReturnValue({
      reading: null,
      error: null,
      needsPermissionPrompt: false,
      requestPermission: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires max-duration finish from walk start despite GPS ticks", async () => {
    const onAutoStop = vi.fn(async () => undefined);
    const startPoint: [number, number] = [53.35, -6.26];
    const maxDurationMs = 5_000;

    type Reading = { lat: number; lng: number; accuracy: number } | null;
    const { rerender, result } = renderHook(
      ({ reading }: { reading: Reading }) => {
        useLiveLocationMock.mockReturnValue({
          reading,
          error: null,
          needsPermissionPrompt: false,
          requestPermission: vi.fn(),
        });
        return useThermometerWalk({
          active: true,
          startPoint,
          targetDistanceMeters: 50_000,
          onAutoStop,
          maxDurationMs,
        });
      },
      { initialProps: { reading: null as Reading } },
    );

    expect(result.current.currentPoint).toBeNull();

    act(() => {
      rerender({
        reading: { lat: 53.3501, lng: -6.2601, accuracy: 8 },
      });
    });

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    act(() => {
      rerender({
        reading: { lat: 53.3502, lng: -6.2602, accuracy: 8 },
      });
    });

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    act(() => {
      rerender({
        reading: { lat: 53.3503, lng: -6.2603, accuracy: 8 },
      });
    });

    expect(onAutoStop).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
      await Promise.resolve();
    });

    expect(onAutoStop).toHaveBeenCalledTimes(1);
    expect(onAutoStop).toHaveBeenCalledWith([53.3503, -6.2603]);
  });
});
