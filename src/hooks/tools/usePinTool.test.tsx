import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import { usePinTool } from "./usePinTool";

describe("usePinTool", () => {
  it("stores the tapped map point in draft state", () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      usePinTool({
        active: true,
        createAnnotation: mocks.createAnnotation,
        finishPlacement: mocks.finishPlacement,
        postSystemMessage: vi.fn(),
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
        postSystemMessage: vi.fn(),
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

  it("tags the pin as a POI and announces it in game chat", async () => {
    const mocks = createToolHookMocks();
    const postSystemMessage = vi.fn();
    const { result } = renderHook(() =>
      usePinTool({
        active: true,
        createAnnotation: mocks.createAnnotation,
        finishPlacement: mocks.finishPlacement,
        postSystemMessage,
      }),
    );

    act(() => {
      result.current.handleMapClick([51.5, -0.12]);
      result.current.panel.props.onLabelChange("Dublin Zoo");
      result.current.panel.props.onPoiCategoryChange("zoo");
    });

    await act(async () => {
      await result.current.panel.props.onCommit();
    });

    expect(mocks.createAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ label: "Dublin Zoo", poiCategory: "zoo" }),
      }),
    );
    expect(postSystemMessage).toHaveBeenCalledWith("Seeker added Zoo pin: Dublin Zoo");
  });

  it("does not tag or announce a plain marker", async () => {
    const mocks = createToolHookMocks();
    const postSystemMessage = vi.fn();
    const { result } = renderHook(() =>
      usePinTool({
        active: true,
        createAnnotation: mocks.createAnnotation,
        finishPlacement: mocks.finishPlacement,
        postSystemMessage,
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
        metadata: expect.not.objectContaining({ poiCategory: expect.anything() }),
      }),
    );
    expect(postSystemMessage).not.toHaveBeenCalled();
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
        postSystemMessage: vi.fn(),
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
