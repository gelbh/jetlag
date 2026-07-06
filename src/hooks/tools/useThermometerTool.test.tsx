import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useThermometerTool } from "./useThermometerTool";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";

describe("useThermometerTool", () => {
  it("collects thermometer endpoints A and B in manual mode", () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useThermometerTool({
        active: true,
        annotations: mocks.annotations,
        gameSize: "large",
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

  it("commits a thermometer annotation when answer is set", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useThermometerTool({
        active: true,
        annotations: mocks.annotations,
        gameSize: "large",
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
});
