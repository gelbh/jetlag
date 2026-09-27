import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";
import { matchingEmptyPlayAreaMessage } from "@/services/geo/matching";
import { jetlagTheme } from "@/theme/theme";
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

const resolveMatchingAnchor = vi.hoisted(() =>
  vi.fn(async () => ({
    features: [
      {
        id: "f-0",
        name: "Dublin Airport",
        point: [53.42, -6.27] as [number, number],
        inPlayArea: true,
      },
    ],
    featureCount: 1,
    inPlayAreaFeatureCount: 1,
    nearestFeatureId: "f-0",
    nearestFeatureName: "Dublin Airport",
    nearestFeaturePoint: [53.42, -6.27] as [number, number],
    distanceMeters: 1200,
    nearestOutsidePlayArea: false,
    nullAnswer: false,
    error: null,
  })),
);

vi.mock("./matching/resolveMatchingAnchor", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./matching/resolveMatchingAnchor")>();
  return {
    ...actual,
    resolveMatchingAnchor: (...args: unknown[]) =>
      resolveMatchingAnchor(...args),
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

  it("marks category unavailable and reopens catalog on empty play area", async () => {
    resolveMatchingAnchor.mockResolvedValueOnce({
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
    });

    const mocks = createToolHookMocks();
    const submitPendingQuestion = vi.fn();
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
        submitPendingQuestion,
        sessionId: "s1",
        senderUid: "u1",
      }),
    );

    await act(async () => {
      result.current.panel.props.model.onCategoryChange("landmass");
    });

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    await waitFor(() => {
      expect(result.current.hud.suppressSheet).toBe(false);
    });

    expect(result.current.hud.mapOverlay).toBeNull();
    expect(result.current.hud.modeBody).not.toBeNull();
    expect(submitPendingQuestion).not.toHaveBeenCalled();

    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        {result.current.hud.modeBody}
      </MantineProvider>,
    );

    expect(
      screen.getByText(matchingEmptyPlayAreaMessage("landmass")),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /landmass/i })).toBeDisabled();
  });
});
