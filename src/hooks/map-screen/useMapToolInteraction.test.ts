import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMapToolInteraction } from "./useMapToolInteraction";

function createHandler() {
  return { handleMapClick: vi.fn() };
}

function renderInteraction(
  overrides: Partial<Parameters<typeof useMapToolInteraction>[0]> = {},
) {
  const radarTool = createHandler();
  const handlers = {
    radarTool,
    thermometerTool: createHandler(),
    measuringTool: createHandler(),
    matchingTool: createHandler(),
    tentacleTool: createHandler(),
    pinTool: createHandler(),
    zoneTool: createHandler(),
  };

  const params = {
    activeTool: "radar" as const,
    ensurePointInGameArea: vi.fn(() => true),
    handleGeometryEditClick: vi.fn(() => false),
    geometryEditActive: false,
    setSelectedAnnotationId: vi.fn(),
    ...handlers,
    ...overrides,
  };

  const hook = renderHook(() => useMapToolInteraction(params));
  return { ...hook, ...handlers, params };
}

describe("useMapToolInteraction", () => {
  it("routes map clicks to the active tool", () => {
    const { result, radarTool } = renderInteraction();

    act(() => {
      result.current.handleMapClick(53.35, -6.26);
    });

    expect(radarTool.handleMapClick).toHaveBeenCalledWith([53.35, -6.26]);
  });

  it("clears selection when no tool is active", () => {
    const setSelectedAnnotationId = vi.fn();
    const { result } = renderInteraction({
      activeTool: "none",
      setSelectedAnnotationId,
    });

    act(() => {
      result.current.handleMapClick(53.35, -6.26);
    });

    expect(setSelectedAnnotationId).toHaveBeenCalledWith(null);
  });

  it("delegates to geometry edit before tool routing", () => {
    const handleGeometryEditClick = vi.fn(() => true);
    const { result, radarTool } = renderInteraction({
      geometryEditActive: true,
      handleGeometryEditClick,
    });

    act(() => {
      result.current.handleMapClick(53.35, -6.26);
    });

    expect(handleGeometryEditClick).toHaveBeenCalledWith([53.35, -6.26]);
    expect(radarTool.handleMapClick).not.toHaveBeenCalled();
  });

  it("ignores clicks outside the play area", () => {
    const { result, radarTool } = renderInteraction({
      ensurePointInGameArea: vi.fn(() => false),
    });

    act(() => {
      result.current.handleMapClick(53.35, -6.26);
    });

    expect(radarTool.handleMapClick).not.toHaveBeenCalled();
  });
});
