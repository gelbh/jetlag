import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestGameArea } from "../../test/fixtures/sessions";
import { useGameAreaFraming } from "./useGameAreaFraming";

const mockBounds = {
  getSouthWest: () => ({ lat: 53.27, lng: -6.45 }),
  getNorthEast: () => ({ lat: 53.42, lng: -6.08 }),
};

describe("useGameAreaFraming", () => {
  it("builds a rectangle game area from viewport bounds", () => {
    const { result } = renderHook(() => useGameAreaFraming());

    act(() => {
      result.current.setFramingMode("rectangle");
      result.current.handleBoundsChange(mockBounds as never);
      result.current.handleUserViewportFramed();
    });

    expect(result.current.manualGameArea?.type).toBe("Polygon");
    expect(result.current.hasValidDraft).toBe(true);
  });

  it("builds a circle game area after center tap and bounds update", () => {
    const { result } = renderHook(() => useGameAreaFraming());

    act(() => {
      result.current.setFramingMode("circle");
    });

    act(() => {
      result.current.handleBoundsChange(mockBounds as never);
      result.current.handleMapClick(53.35, -6.26);
    });

    expect(result.current.circleCenter).toEqual([53.35, -6.26]);
    expect(result.current.manualGameArea?.type).toBe("Polygon");
    expect(result.current.hasValidDraft).toBe(true);
  });

  it("closes a polygon after enough vertices", () => {
    const { result } = renderHook(() => useGameAreaFraming());

    act(() => {
      result.current.setFramingMode("polygon");
    });

    act(() => {
      result.current.handleMapClick(53.3, -6.4);
      result.current.handleMapClick(53.3, -6.2);
      result.current.handleMapClick(53.4, -6.2);
    });

    expect(result.current.hasValidDraft).toBe(false);

    act(() => {
      expect(result.current.closePolygon()).toBe(true);
    });

    expect(result.current.hasValidDraft).toBe(true);
    expect(result.current.manualGameArea?.coordinates[0]).toHaveLength(4);
  });

  it("does not frame from viewport pan while place geometry is active", () => {
    const { result } = renderHook(() =>
      useGameAreaFraming({
        initialFocusBounds: {
          south: 53.27,
          west: -6.45,
          north: 53.42,
          east: -6.08,
        },
      }),
    );

    act(() => {
      result.current.resetManualFraming();
      result.current.handleBoundsChange(mockBounds as never);
      result.current.handleUserViewportFramed();
    });

    expect(result.current.userFramed).toBe(false);
    expect(result.current.manualGameArea).toBeNull();
  });

  it("clears manual draft when switching shape mode", () => {
    const { result } = renderHook(() => useGameAreaFraming());

    act(() => {
      result.current.setFramingMode("circle");
    });

    act(() => {
      result.current.handleBoundsChange(mockBounds as never);
      result.current.handleMapClick(53.35, -6.26);
    });

    act(() => {
      result.current.setFramingMode("rectangle");
    });

    expect(result.current.circleCenter).toBeNull();
    expect(result.current.manualGameArea).toBeNull();
    expect(result.current.userFramed).toBe(true);
  });

  describe("viewport suppress timeout", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("keeps suppression armed until the latest focus duration elapses", () => {
      const { result } = renderHook(() => useGameAreaFraming());
      const area = createTestGameArea();

      act(() => {
        result.current.applyFocusToGameArea(area);
      });
      expect(result.current.ignoreViewportUpdatesRef.current).toBe(true);

      act(() => {
        vi.advanceTimersByTime(300);
        result.current.applyFocusToGameArea(area);
      });

      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(result.current.ignoreViewportUpdatesRef.current).toBe(true);

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current.ignoreViewportUpdatesRef.current).toBe(false);
    });
  });
});
