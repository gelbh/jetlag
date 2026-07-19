import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToolRailShortcuts } from "./useToolRailShortcuts";
import type { MapTool } from "../../domain/map/mapToolTypes";

const TOOL_ORDER = [
  "matching",
  "measuring",
  "thermometer",
] as const satisfies readonly MapTool[];

describe("useToolRailShortcuts", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query.includes("pointer: fine"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps digit keys to tools in dock order and toggles active", () => {
    const onSelect = vi.fn();
    renderHook(() =>
      useToolRailShortcuts({
        enabled: true,
        activeTool: "none",
        onSelect,
        toolOrder: TOOL_ORDER,
      }),
    );

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "2" }));
    expect(onSelect).toHaveBeenCalledWith("measuring");
  });

  it("toggles off when the active tool digit is pressed", () => {
    const onSelect = vi.fn();
    renderHook(() =>
      useToolRailShortcuts({
        enabled: true,
        activeTool: "matching",
        onSelect,
        toolOrder: TOOL_ORDER,
      }),
    );

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    expect(onSelect).toHaveBeenCalledWith("none");
  });

  it("ignores shortcuts while typing in inputs", () => {
    const onSelect = vi.fn();
    renderHook(() =>
      useToolRailShortcuts({
        enabled: true,
        activeTool: "none",
        onSelect,
        toolOrder: TOOL_ORDER,
      }),
    );

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "1", bubbles: true }),
    );
    expect(onSelect).not.toHaveBeenCalled();
    input.remove();
  });

  it("does nothing when disabled", () => {
    const onSelect = vi.fn();
    renderHook(() =>
      useToolRailShortcuts({
        enabled: false,
        activeTool: "none",
        onSelect,
        toolOrder: TOOL_ORDER,
      }),
    );

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does nothing when gated off (e.g. overlay sheet open)", () => {
    const onSelect = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useToolRailShortcuts({
          enabled,
          activeTool: "none",
          onSelect,
          toolOrder: TOOL_ORDER,
        }),
      { initialProps: { enabled: true } },
    );

    rerender({ enabled: false });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
