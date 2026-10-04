import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { haversineMeters } from "../../domain/geometry/gameArea/distance";
import type { MapBoundsExpression } from "../../domain/map/mapBounds";
import { createTestGameArea } from "../../test/fixtures/sessions";
import { useGameAreaFraming } from "./useGameAreaFraming";

const mockBounds = {
  getSouthWest: () => ({ lat: 53.27, lng: -6.45 }),
  getNorthEast: () => ({ lat: 53.42, lng: -6.08 }),
};

describe("useGameAreaFraming", () => {
  it("builds a square game area from a rectangular viewport", () => {
    const { result } = renderHook(() => useGameAreaFraming());

    act(() => {
      result.current.setFramingMode("rectangle");
      result.current.handleBoundsChange(mockBounds as never);
      result.current.handleUserViewportFramed();
    });

    expect(result.current.manualGameArea?.type).toBe("Polygon");
    const ring = result.current.manualGameArea?.coordinates[0];
    expect(ring).toBeDefined();
    const west = ring![0]![0];
    const south = ring![0]![1];
    const east = ring![2]![0];
    const north = ring![2]![1];
    if (
      typeof west !== "number" ||
      typeof south !== "number" ||
      typeof east !== "number" ||
      typeof north !== "number"
    ) {
      throw new Error("expected numeric polygon ring");
    }
    const centerLat = (south + north) / 2;
    const centerLng = (west + east) / 2;
    const ns = haversineMeters([centerLat, centerLng], [north, centerLng]);
    const ew = haversineMeters([centerLat, centerLng], [centerLat, east]);
    expect(Math.abs(ns - ew)).toBeLessThan(1);
    expect(result.current.hasValidDraft).toBe(true);
  });

  it("builds a circle game area from the viewport center when switching mode", () => {
    const { result } = renderHook(() => useGameAreaFraming());

    act(() => {
      result.current.handleBoundsChange(mockBounds as never);
      result.current.setFramingMode("circle");
    });

    expect(result.current.circleCenter?.[0]).toBeCloseTo(53.345, 5);
    expect(result.current.circleCenter?.[1]).toBeCloseTo(-6.265, 5);
    expect(result.current.manualGameArea?.type).toBe("Polygon");
    expect(result.current.hasValidDraft).toBe(true);
  });

  it("moves the circle center on map tap after an immediate draft", () => {
    const { result } = renderHook(() => useGameAreaFraming());

    act(() => {
      result.current.handleBoundsChange(mockBounds as never);
      result.current.setFramingMode("circle");
    });

    act(() => {
      result.current.handleMapClick(53.35, -6.26);
    });

    expect(result.current.circleCenter).toEqual([53.35, -6.26]);
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

  it("replaces the draft immediately when switching shape mode", () => {
    const { result } = renderHook(() => useGameAreaFraming());

    act(() => {
      result.current.handleBoundsChange(mockBounds as never);
      result.current.setFramingMode("circle");
    });

    const circleArea = result.current.manualGameArea;
    expect(circleArea).not.toBeNull();
    expect(result.current.circleCenter?.[0]).toBeCloseTo(53.345, 5);
    expect(result.current.circleCenter?.[1]).toBeCloseTo(-6.265, 5);

    act(() => {
      result.current.setFramingMode("rectangle");
    });

    expect(result.current.circleCenter).toBeNull();
    expect(result.current.manualGameArea).not.toBeNull();
    expect(result.current.manualGameArea).not.toEqual(circleArea);
    expect(result.current.userFramed).toBe(true);
  });

  it("applyFocusBounds sets focus without a manual game area", () => {
    const { result } = renderHook(() => useGameAreaFraming());
    const bounds: MapBoundsExpression = [
      [53.332, -6.278],
      [53.368, -6.242],
    ];

    act(() => {
      result.current.applyFocusBounds(bounds);
    });

    expect(result.current.focusBounds).toEqual(bounds);
    expect(result.current.manualGameArea).toBeNull();
    expect(result.current.hasValidDraft).toBe(false);
  });

  it("applyFocusBounds does not mint an area from the first viewport", () => {
    const { result } = renderHook(() => useGameAreaFraming());

    act(() => {
      result.current.applyFocusBounds([
        [53.332, -6.278],
        [53.368, -6.242],
      ]);
      result.current.handleBoundsChange(mockBounds as never);
      result.current.handleUserViewportFramed();
    });

    expect(result.current.manualGameArea).toBeNull();
    expect(result.current.hasValidDraft).toBe(false);
    expect(result.current.userFramed).toBe(false);
  });

  it("applyFocusBounds keeps an existing framed area through a later viewport", () => {
    const { result } = renderHook(() => useGameAreaFraming());

    act(() => {
      result.current.setFramingMode("rectangle");
      result.current.handleBoundsChange(mockBounds as never);
      result.current.handleUserViewportFramed();
    });
    const framed = result.current.manualGameArea;
    expect(framed).not.toBeNull();

    const gpsViewport = {
      getSouthWest: () => ({ lat: 51.4, lng: -0.25 }),
      getNorthEast: () => ({ lat: 51.6, lng: 0.05 }),
    };

    act(() => {
      result.current.applyFocusBounds([
        [53.332, -6.278],
        [53.368, -6.242],
      ]);
      result.current.handleBoundsChange(gpsViewport as never);
      result.current.handleUserViewportFramed();
    });

    expect(result.current.manualGameArea).toEqual(framed);
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
