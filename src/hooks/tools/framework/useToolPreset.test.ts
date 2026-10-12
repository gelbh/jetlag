import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DockableMapTool } from "../../../domain/map/mapTools";
import type { MapTool } from "../../../domain/map/mapToolTypes";
import { useMapStore } from "../../../state/mapStore";
import { resetAllStores } from "../../../test/helpers/storeReset";
import { useOpenToolPreset, useToolPreset } from "./useToolPreset";

describe("useToolPreset", () => {
  beforeEach(() => {
    resetAllStores();
  });

  it("applies this tool's preset once and consumes it", () => {
    useMapStore.getState().openToolPreset("radar", 1609.344);
    const apply = vi.fn();

    const { rerender } = renderHook(() => useToolPreset("radar", true, apply));

    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(1609.344);
    expect(useMapStore.getState().toolPreset).toBeNull();

    rerender();
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("waits until enabled", () => {
    useMapStore.getState().openToolPreset("radar", 1609.344);
    const apply = vi.fn();

    const { rerender } = renderHook(({ enabled }) => useToolPreset("radar", enabled, apply), {
      initialProps: { enabled: false },
    });

    expect(apply).not.toHaveBeenCalled();
    expect(useMapStore.getState().toolPreset).toEqual({ tool: "radar", optionKey: 1609.344 });

    rerender({ enabled: true });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(1609.344);
  });

  it("ignores another tool's preset", () => {
    useMapStore.getState().openToolPreset("photo", "park");
    const apply = vi.fn();

    renderHook(() => useToolPreset("radar", true, apply));

    expect(apply).not.toHaveBeenCalled();
    expect(useMapStore.getState().toolPreset).toEqual({ tool: "photo", optionKey: "park" });
  });

  it("applies a preset opened after mount", () => {
    const apply = vi.fn();
    renderHook(() => useToolPreset("radar", true, apply));

    act(() => {
      useMapStore.getState().openToolPreset("radar", 804.672);
    });

    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(804.672);
  });
});

describe("useOpenToolPreset", () => {
  beforeEach(() => {
    resetAllStores();
  });

  function renderOpen(activeTool: MapTool, enabled: boolean, canOpen = true) {
    const selectTool = vi.fn<(tool: DockableMapTool) => void>();
    const isToolEnabled = () => enabled;
    const view = renderHook(
      (props: { activeTool: MapTool; canOpen: boolean }) =>
        useOpenToolPreset({ ...props, isToolEnabled, selectTool }),
      { initialProps: { activeTool, canOpen } },
    );
    return { selectTool, ...view };
  }

  it("selects the preset's tool and leaves the preset for the tool hook", () => {
    useMapStore.getState().openToolPreset("radar", 1609.344);

    const { selectTool } = renderOpen("none", true);

    expect(selectTool).toHaveBeenCalledTimes(1);
    expect(selectTool).toHaveBeenCalledWith("radar");
    expect(useMapStore.getState().toolPreset).toEqual({ tool: "radar", optionKey: 1609.344 });
  });

  it("does not reselect the active tool", () => {
    useMapStore.getState().openToolPreset("radar", 1609.344);

    const { selectTool } = renderOpen("radar", true);

    expect(selectTool).not.toHaveBeenCalled();
  });

  it("drops the preset when its tool is disabled", () => {
    useMapStore.getState().openToolPreset("radar", 1609.344);

    const { selectTool } = renderOpen("none", false);

    expect(selectTool).not.toHaveBeenCalled();
    expect(useMapStore.getState().toolPreset).toBeNull();
  });

  it("drops the preset when the user leaves the tool before it is consumed", () => {
    useMapStore.getState().openToolPreset("radar", 1609.344);

    const { selectTool, rerender } = renderOpen("none", true);
    rerender({ activeTool: "radar", canOpen: false });
    rerender({ activeTool: "none", canOpen: true });

    expect(selectTool).toHaveBeenCalledTimes(1);
    expect(useMapStore.getState().toolPreset).toBeNull();
  });

  it("drops the preset when the map is not idle", () => {
    useMapStore.getState().openToolPreset("radar", 1609.344);

    const { selectTool } = renderOpen("none", true, false);

    expect(selectTool).not.toHaveBeenCalled();
    expect(useMapStore.getState().toolPreset).toBeNull();
  });

  it("clears the preset on unmount", () => {
    useMapStore.getState().openToolPreset("radar", 1609.344);

    const { unmount } = renderOpen("radar", true);
    expect(useMapStore.getState().toolPreset).not.toBeNull();

    unmount();
    expect(useMapStore.getState().toolPreset).toBeNull();
  });
});
