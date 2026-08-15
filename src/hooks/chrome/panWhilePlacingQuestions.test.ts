import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createViewportTrackerHandlers } from "../../components/map/helpers/createViewportTrackerHandlers";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import { useMatchingTool } from "../tools/useMatchingTool";
import { useRadarTool } from "../tools/useRadarTool";
import { useThermometerTool } from "../tools/useThermometerTool";
import { useToolPanelChrome } from "./useToolPanelChrome";

/**
 * Matrix: pan mid-placement must keep the tool selected, clear mapPanning, and
 * accept the next place tap. Thermometer is multi-point; radar/matching are
 * single-tap place tools sharing the same chrome path.
 */
describe("pan while placing questions", () => {
  it("thermometer: A → pan start/end → B keeps draft and place step", () => {
    const mocks = createToolHookMocks();
    const chrome = renderHook(() =>
      useToolPanelChrome("thermometer", { sheetSnap: "peek" }),
    );
    const thermo = renderHook(() =>
      useThermometerTool({
        active: true,
        annotations: mocks.annotations,
        sessionRules: { gameSize: "large" },
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
      }),
    );

    const handlers = createViewportTrackerHandlers({
      publish: vi.fn(),
      onUserPanStart: () => chrome.result.current.handleMapPanStart(),
      onUserPanEnd: () => chrome.result.current.handleMapPanEnd(),
    });

    act(() => {
      thermo.result.current.panel.props.onPlacementModeChange("manual");
    });
    act(() => {
      expect(
        thermo.result.current.handleMapClick([53.35, -6.26]),
      ).toBe(true);
    });

    act(() => {
      handlers.onDragStart();
    });
    expect(chrome.result.current.mapPanning).toBe(true);

    act(() => {
      handlers.onDragEnd();
    });
    expect(chrome.result.current.mapPanning).toBe(false);
    expect(chrome.result.current.userMinimized).toBe(true);

    act(() => {
      expect(
        thermo.result.current.handleMapClick([53.36, -6.25]),
      ).toBe(true);
    });

    expect(thermo.result.current.draft.thermoA).toEqual([53.35, -6.26]);
    expect(thermo.result.current.draft.thermoB).toEqual([53.36, -6.25]);
    expect(mocks.finishPlacement).not.toHaveBeenCalled();
    // HUD: both pins → ask chord (map taps no longer place).
    expect(thermo.result.current.panel.props.wizardStepRef.current).toBe(
      "ask",
    );
  });

  it("radar: pan mid-place then tap still places and does not close tool", () => {
    const mocks = createToolHookMocks();
    const chrome = renderHook(() =>
      useToolPanelChrome("radar", { sheetSnap: "peek" }),
    );
    const radar = renderHook(() =>
      useRadarTool({
        active: true,
        annotations: mocks.annotations,
        gameSize: "medium",
        createAnnotation: mocks.createAnnotation,
        distanceUnit: mocks.distanceUnit,
        finishPlacement: mocks.finishPlacement,
        setMapError: mocks.setMapError,
        mapError: mocks.mapError,
        gpsLoading: mocks.gpsLoading,
        awaitingPlacement: mocks.awaitingPlacement,
        setAwaitingPlacement: mocks.setAwaitingPlacement,
        refreshGps: mocks.refreshGps,
        ensurePointInGameArea: mocks.ensurePointInGameArea,
        armPlacement: mocks.armPlacement,
      }),
    );

    const handlers = createViewportTrackerHandlers({
      publish: vi.fn(),
      onUserPanStart: () => chrome.result.current.handleMapPanStart(),
      onUserPanEnd: () => chrome.result.current.handleMapPanEnd(),
    });

    act(() => {
      handlers.onDragStart();
      handlers.onMoveEnd(); // dragend missed — moveend safety
    });
    expect(chrome.result.current.mapPanning).toBe(false);

    act(() => {
      expect(radar.result.current.handleMapClick([53.35, -6.26])).toBe(true);
    });

    expect(radar.result.current.draft.radarCenter).toEqual([53.35, -6.26]);
    expect(mocks.finishPlacement).not.toHaveBeenCalled();
  });

  it("matching: pan then place keeps tool open", () => {
    const mocks = createToolHookMocks();
    const chrome = renderHook(() =>
      useToolPanelChrome("matching", { sheetSnap: "peek" }),
    );
    const matching = renderHook(() =>
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
      }),
    );

    const handlers = createViewportTrackerHandlers({
      publish: vi.fn(),
      onUserPanStart: () => chrome.result.current.handleMapPanStart(),
      onUserPanEnd: () => chrome.result.current.handleMapPanEnd(),
    });

    act(() => {
      matching.result.current.panel.props.onCategoryChange("commercial_airport");
    });

    act(() => {
      handlers.onDragStart();
      handlers.onDragEnd();
    });
    expect(chrome.result.current.mapPanning).toBe(false);

    act(() => {
      expect(
        matching.result.current.handleMapClick([53.35, -6.26]),
      ).toBe(true);
    });

    expect(matching.result.current.draft.matchingSeekerPoint).toEqual([
      53.35, -6.26,
    ]);
    expect(mocks.finishPlacement).not.toHaveBeenCalled();
  });
});
