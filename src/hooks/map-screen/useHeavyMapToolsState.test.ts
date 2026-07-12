import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHeavyMapToolsState } from "./useHeavyMapToolsState";
import { createIdleHeavyMapTools } from "./heavyMapTools";

describe("useHeavyMapToolsState", () => {
  it("uses idle heavy tools when no heavy tool is active", () => {
    const { result } = renderHook(() => useHeavyMapToolsState("radar"));

    expect(result.current.heavyToolActive).toBe(false);
    expect(result.current.matchingTool.panel).toBeNull();
  });

  it("activates heavy tools for matching, measuring, and tentacle", () => {
    const { result, rerender } = renderHook(
      ({ tool }) => useHeavyMapToolsState(tool),
      { initialProps: { tool: "matching" as const } },
    );

    expect(result.current.heavyToolActive).toBe(true);

    rerender({ tool: "measuring" });
    expect(result.current.heavyToolActive).toBe(true);

    rerender({ tool: "tentacle" });
    expect(result.current.heavyToolActive).toBe(true);
  });

  it("accepts heavy tool API updates from the slot", () => {
    const customTools = createIdleHeavyMapTools();
    const { result } = renderHook(() => useHeavyMapToolsState("matching"));

    act(() => {
      result.current.handleHeavyToolsChange(customTools);
    });

    expect(result.current.matchingTool).toBe(customTools.matchingTool);
  });
});
