import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMatchingTool } from "./useMatchingTool";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";

vi.mock("../forms/useDebouncedValue", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock("../../services/core/location/geolocation", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../services/core/location/geolocation")
    >();
  return {
    ...actual,
    queryGeolocationPermission: vi.fn(async () => "prompt" as const),
  };
});

vi.mock("./matching/resolveMatchingAnchor", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./matching/resolveMatchingAnchor")>();
  return {
    ...actual,
    resolveMatchingAnchor: vi.fn(async () => ({
      features: [],
      featureCount: 0,
      inPlayAreaFeatureCount: 0,
      nearestFeatureId: null,
      nearestFeatureName: null,
      nearestFeaturePoint: null,
      distanceMeters: null,
      nearestOutsidePlayArea: false,
      nullAnswer: true,
      error: null,
    })),
  };
});

describe("useMatchingTool map-first answer", () => {
  it("keeps the Ask sheet suppressed and reaches answer phase on the map", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useMatchingTool({
        active: true,
        annotations: mocks.annotations,
        gameArea: mocks.gameArea,
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        gpsLoading: mocks.gpsLoading,
        mapError: mocks.mapError,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
        awaitHiderAnswer: true,
      }),
    );

    await act(async () => {
      result.current.panel.props.model.onCategoryChange("commercial_airport");
    });

    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBe(true);
    });

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    await waitFor(() => {
      expect(result.current.draft.seekerResolving).toBe(false);
    });

    expect(result.current.hud.suppressSheet).toBe(true);
    expect(result.current.hud.mapOverlay).not.toBeNull();
    expect(result.current.hud.modeBody).toBeNull();
  });
});
