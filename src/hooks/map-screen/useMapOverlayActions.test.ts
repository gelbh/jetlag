import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMapOverlayActions } from "./useMapOverlayActions";

describe("useMapOverlayActions", () => {
  it("resets tool state before opening a sheet overlay", () => {
    const overlay = {
      openChat: vi.fn(),
      openSettings: vi.fn(),
      openLog: vi.fn(),
      openSheet: vi.fn(),
    };
    const resetToolDrafts = vi.fn();
    const setActiveTool = vi.fn();
    const setAwaitingPlacement = vi.fn();
    const setSelectedAnnotationId = vi.fn();
    const cancelGeometryEdit = vi.fn();

    const { result } = renderHook(() =>
      useMapOverlayActions({
        overlay,
        resetToolDrafts,
        setActiveTool,
        setAwaitingPlacement,
        setSelectedAnnotationId,
        cancelGeometryEdit,
      }),
    );

    act(() => {
      result.current.handleOpenChat();
    });

    expect(resetToolDrafts).toHaveBeenCalled();
    expect(setActiveTool).toHaveBeenCalledWith("none");
    expect(setAwaitingPlacement).toHaveBeenCalledWith(false);
    expect(setSelectedAnnotationId).toHaveBeenCalledWith(null);
    expect(cancelGeometryEdit).toHaveBeenCalled();
    expect(overlay.openSheet).toHaveBeenCalledWith("chat");
  });
});
