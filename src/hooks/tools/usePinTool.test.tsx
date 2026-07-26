import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePinTool } from "./usePinTool";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";

describe("usePinTool", () => {
  it("stores the tapped map point in draft state", () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      usePinTool({
        active: true,
        createAnnotation: mocks.createAnnotation,
        finishPlacement: mocks.finishPlacement,
      }),
    );

    act(() => {
      result.current.handleMapClick([51.5, -0.12]);
    });

    expect(result.current.draft.pinPoint).toEqual([51.5, -0.12]);
    expect(result.current.placementCrosshair).toBe(false);
  });

  it("creates a pin annotation when label and point are set", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      usePinTool({
        active: true,
        createAnnotation: mocks.createAnnotation,
        finishPlacement: mocks.finishPlacement,
      }),
    );

    act(() => {
      result.current.handleMapClick([51.5, -0.12]);
      result.current.panel.props.onLabelChange("Camp");
    });

    await act(async () => {
      await result.current.panel.props.onCommit();
    });

    expect(mocks.createAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "pin",
        metadata: expect.objectContaining({ label: "Camp" }),
      }),
    );
    expect(mocks.finishPlacement).toHaveBeenCalled();
  });

  it("locks double commit while createAnnotation is in flight", async () => {
    let resolveCreate!: (value: unknown) => void;
    const createAnnotation = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const finishPlacement = vi.fn();
    const { result } = renderHook(() =>
      usePinTool({
        active: true,
        createAnnotation: createAnnotation as never,
        finishPlacement,
      }),
    );

    act(() => {
      result.current.handleMapClick([51.5, -0.12]);
      result.current.panel.props.onLabelChange("Camp");
    });

    await act(async () => {
      void result.current.panel.props.onCommit();
      void result.current.panel.props.onCommit();
    });

    expect(createAnnotation).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate({ id: "pin-1" });
    });
  });
});
