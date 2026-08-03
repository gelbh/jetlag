import { describe, expect, it, vi } from "vitest";
import { createViewportTrackerHandlers } from "./createViewportTrackerHandlers";

describe("createViewportTrackerHandlers", () => {
  it("notifies pan start on dragstart and clears on dragend", () => {
    const onUserPanStart = vi.fn();
    const onUserPanEnd = vi.fn();
    const handlers = createViewportTrackerHandlers({
      publish: vi.fn(),
      onUserPanStart,
      onUserPanEnd,
    });

    handlers.onDragStart();
    expect(onUserPanStart).toHaveBeenCalledTimes(1);
    expect(handlers.isPanActive()).toBe(true);

    handlers.onDragEnd();
    expect(onUserPanEnd).toHaveBeenCalledTimes(1);
    expect(handlers.isPanActive()).toBe(false);
  });

  it("clears pan on moveend when dragend is missed", () => {
    const onUserPanEnd = vi.fn();
    const handlers = createViewportTrackerHandlers({
      publish: vi.fn(),
      onUserPanStart: vi.fn(),
      onUserPanEnd,
    });

    handlers.onDragStart();
    handlers.onMoveEnd();

    expect(onUserPanEnd).toHaveBeenCalledTimes(1);
    expect(handlers.isPanActive()).toBe(false);
  });

  it("ends an active pan when the publisher is disposed (tracker remount)", () => {
    const onUserPanEnd = vi.fn();
    const handlers = createViewportTrackerHandlers({
      publish: vi.fn(),
      onUserPanStart: vi.fn(),
      onUserPanEnd,
    });

    handlers.onDragStart();
    handlers.disposePublisher();

    expect(onUserPanEnd).toHaveBeenCalledTimes(1);
    expect(handlers.isPanActive()).toBe(false);
  });

  it("does not double-notify pan start while already panning", () => {
    const onUserPanStart = vi.fn();
    const handlers = createViewportTrackerHandlers({
      publish: vi.fn(),
      onUserPanStart,
      onUserPanEnd: vi.fn(),
    });

    handlers.onDragStart();
    handlers.onDragStart();

    expect(onUserPanStart).toHaveBeenCalledTimes(1);
  });
});
