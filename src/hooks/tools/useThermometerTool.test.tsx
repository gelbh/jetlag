import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import { useMapStore } from "../../state/mapStore";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import { useThermometerTool } from "./useThermometerTool";

describe("useThermometerTool", () => {
  beforeEach(() => {
    useMapStore.getState().setActiveTool("thermometer");
  });

  it("collects thermometer endpoints A and B in manual mode", () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
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

    act(() => {
      result.current.panel.props.onPlacementModeChange("manual");
    });
    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });
    act(() => {
      result.current.handleMapClick([53.36, -6.25]);
    });

    expect(result.current.draft.thermoA).toEqual([53.35, -6.26]);
    expect(result.current.draft.thermoB).toEqual([53.36, -6.25]);
  });

  it("ignores manual map taps after both pins are set (ask chord)", () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
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

    act(() => {
      result.current.panel.props.onPlacementModeChange("manual");
    });
    act(() => {
      expect(result.current.handleMapClick([53.35, -6.26])).toBe(true);
    });
    act(() => {
      expect(result.current.handleMapClick([53.36, -6.25])).toBe(true);
    });
    act(() => {
      expect(result.current.handleMapClick([53.37, -6.24])).toBe(false);
    });

    expect(result.current.draft.thermoA).toEqual([53.35, -6.26]);
    expect(result.current.draft.thermoB).toEqual([53.36, -6.25]);
    expect(result.current.panel.props.wizardStepRef.current).toBe("ask");
  });

  it("commits a thermometer annotation when answer is set", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
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

    act(() => {
      result.current.panel.props.onPlacementModeChange("manual");
    });
    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
    });
    act(() => {
      result.current.handleMapClick([53.36, -6.25]);
    });
    act(() => {
      result.current.panel.props.onAnswerChange("hotter");
    });

    await act(async () => {
      await result.current.commit();
    });

    expect(mocks.createAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({ type: "thermometer" }),
    );
  });

  it("moves off the picked distance once another question uses it", () => {
    const mocks = createToolHookMocks();
    const { result, rerender } = renderHook(
      ({ pendingQuestions }) =>
        useThermometerTool({
          active: true,
          annotations: mocks.annotations,
          pendingQuestions,
          sessionRules: { gameSize: "large" },
          createAnnotation: mocks.createAnnotation,
          distanceUnit: mocks.distanceUnit,
          finishPlacement: mocks.finishPlacement,
          setMapError: mocks.setMapError,
        }),
      { initialProps: { pendingQuestions: [] as PendingQuestionRecord[] } },
    );
    const picked = result.current.draft.thermometerDistanceMeters;

    rerender({
      pendingQuestions: [
        {
          id: "pq-thermo",
          toolType: "thermometer",
          status: "pending",
          placement: { metadata: { thermometerDistanceMeters: picked } },
        } as unknown as PendingQuestionRecord,
      ],
    });

    expect(result.current.draft.thermometerDistanceMeters).not.toBe(picked);
  });
});
