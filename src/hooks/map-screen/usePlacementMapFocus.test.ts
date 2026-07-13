import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePlacementMapFocus } from "./usePlacementMapFocus";
import type { MapDraftOverlay } from "../../domain/map/mapDraftOverlay";

const defaultBounds: [[number, number], [number, number]] = [
  [53.34, -6.27],
  [53.36, -6.25],
];

const markerOverlay = (id: string, point: [number, number]): MapDraftOverlay => ({
  kind: "marker",
  id,
  point,
});

describe("usePlacementMapFocus", () => {
  it("uses default focus bounds until overlays change", () => {
    const { result } = renderHook(() =>
      usePlacementMapFocus({
        activeTool: "pin",
        overlays: [],
        defaultFocusBounds: defaultBounds,
        enabled: true,
      }),
    );

    expect(result.current.effectiveFocusBounds).toEqual(defaultBounds);
    expect(result.current.placementRecenterToken).toBe(0);
    expect(result.current.focusPaddingBias).toBe(120);
  });

  it("bumps recenter token when structural overlays change", () => {
    const { result, rerender } = renderHook(
      ({ overlays }: { overlays: MapDraftOverlay[] }) =>
        usePlacementMapFocus({
          activeTool: "pin",
          overlays,
          defaultFocusBounds: defaultBounds,
          enabled: true,
        }),
      { initialProps: { overlays: [] as MapDraftOverlay[] } },
    );

    rerender({ overlays: [markerOverlay("pin-draft", [53.35, -6.26])] });

    expect(result.current.placementRecenterToken).toBe(1);
    expect(result.current.effectiveFocusBounds).not.toEqual(defaultBounds);
  });

  it("does not bump token when fingerprint is unchanged", () => {
    const overlays = [markerOverlay("pin-draft", [53.35, -6.26])];
    const { result, rerender } = renderHook(
      ({ nextOverlays }: { nextOverlays: MapDraftOverlay[] }) =>
        usePlacementMapFocus({
          activeTool: "pin",
          overlays: nextOverlays,
          defaultFocusBounds: defaultBounds,
          enabled: true,
        }),
      { initialProps: { nextOverlays: overlays } },
    );

    expect(result.current.placementRecenterToken).toBe(1);

    rerender({ nextOverlays: [...overlays] });
    expect(result.current.placementRecenterToken).toBe(1);
  });

  it("throttles walk reframes to at most once every 2 seconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T10:00:00Z"));

    const { result, rerender } = renderHook(
      ({ overlays }: { overlays: MapDraftOverlay[] }) =>
        usePlacementMapFocus({
          activeTool: "thermometer",
          overlays,
          defaultFocusBounds: defaultBounds,
          enabled: true,
          walkActive: true,
        }),
      { initialProps: { overlays: [markerOverlay("thermo-draft-a", [53.35, -6.26])] } },
    );

    expect(result.current.placementRecenterToken).toBe(1);

    rerender({
      overlays: [markerOverlay("thermo-draft-a", [53.351, -6.261])],
    });
    expect(result.current.placementRecenterToken).toBe(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    rerender({
      overlays: [markerOverlay("thermo-draft-a", [53.352, -6.262])],
    });
    expect(result.current.placementRecenterToken).toBe(2);

    vi.useRealTimers();
  });
});
