import { MantineProvider } from "@mantine/core";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { matchingEmptyPlayAreaMessage } from "@/services/geo/matching";
import { jetlagTheme } from "@/theme/theme";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import type { ResolveMatchingAnchorResult } from "./matching/resolveMatchingAnchor";
import { useMatchingTool } from "./useMatchingTool";

vi.mock("../forms/useDebouncedValue", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

vi.mock("../../services/core/location/geolocation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/core/location/geolocation")>();
  return {
    ...actual,
    queryGeolocationPermission: vi.fn(async () => "prompt" as const),
  };
});

const resolveMatchingAnchor = vi.hoisted(() => {
  const defaultResult = {
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
    nearestFeatureId: "f-0" as string | null,
    nearestFeatureName: "Dublin Airport" as string | null,
    nearestFeaturePoint: [53.42, -6.27] as [number, number] | null,
    distanceMeters: 1200 as number | null,
    nearestOutsidePlayArea: false,
    nullAnswer: false,
    error: null as string | null,
  } satisfies ResolveMatchingAnchorResult;
  return vi.fn(async (): Promise<ResolveMatchingAnchorResult> => defaultResult);
});

vi.mock("./matching/resolveMatchingAnchor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./matching/resolveMatchingAnchor")>();
  return {
    ...actual,
    resolveMatchingAnchor: (() => resolveMatchingAnchor()) as typeof actual.resolveMatchingAnchor,
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

    expect(screen.getByText(matchingEmptyPlayAreaMessage("landmass"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /landmass/i })).toBeDisabled();
  });

  it("re-pins on map tap while answering and clears solo answer", async () => {
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
        awaitHiderAnswer: false,
      }),
    );

    await act(async () => {
      result.current.panel.props.model.onCategoryChange("commercial_airport");
    });

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    await waitFor(() => {
      expect(result.current.draft.seekerResolving).toBe(false);
      expect(result.current.draft.matchingSeekerPoint).toEqual([53.35, -6.26]);
    });

    act(() => {
      result.current.panel.props.model.onAnswerChange("yes");
    });

    expect(result.current.panel.props.model.matchingAnswer).toBe("yes");

    let accepted = false;
    act(() => {
      accepted = result.current.handleMapClick([53.36, -6.25]);
    });

    expect(accepted).toBe(true);
    expect(result.current.draft.matchingSeekerPoint).toEqual([53.36, -6.25]);
    expect(result.current.panel.props.model.matchingAnswer).toBeNull();
  });

  it("re-pins on map tap while answering in multiplayer", async () => {
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

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });

    await waitFor(() => {
      expect(result.current.draft.seekerResolving).toBe(false);
      expect(result.current.draft.matchingSeekerPoint).toEqual([53.35, -6.26]);
    });

    let accepted = false;
    act(() => {
      accepted = result.current.handleMapClick([53.36, -6.25]);
    });

    expect(accepted).toBe(true);
    expect(result.current.draft.matchingSeekerPoint).toEqual([53.36, -6.25]);
  });
});
