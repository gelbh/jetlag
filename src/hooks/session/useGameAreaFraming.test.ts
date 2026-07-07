import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
  });
});
