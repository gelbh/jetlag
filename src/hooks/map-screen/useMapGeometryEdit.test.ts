import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotationRecord } from "../../domain/map/annotations";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";
import { useMapGeometryEdit } from "./useMapGeometryEdit";

const storeMocks = vi.hoisted(() => {
  const state = {
    geometryEditAnnotationId: null as string | null,
    setSelectedAnnotationId: vi.fn(),
    setActiveTool: vi.fn(),
    setGeometryEditAnnotationId: vi.fn((id: string | null) => {
      state.geometryEditAnnotationId = id;
    }),
  };
  return state;
});

vi.mock("../../state/sessionStore", () => ({
  useAnnotationStore: vi.fn(
    (selector: (state: typeof storeMocks) => unknown) => selector(storeMocks),
  ),
  useMapStore: vi.fn((selector: (state: { setActiveTool: typeof storeMocks.setActiveTool }) => unknown) =>
    selector({ setActiveTool: storeMocks.setActiveTool }),
  ),
}));

const pinAnnotation: AnnotationRecord = {
  id: "ann-pin",
  sessionId: "local",
  type: "pin",
  status: "active",
  geometry: {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Point",
      coordinates: [-6.26, 53.35],
    },
  },
  metadata: { createdAt: "2026-01-01T00:00:00.000Z" },
};

describe("useMapGeometryEdit", () => {
  beforeEach(() => {
    storeMocks.geometryEditAnnotationId = null;
    storeMocks.setSelectedAnnotationId.mockReset();
    storeMocks.setActiveTool.mockReset();
    storeMocks.setGeometryEditAnnotationId.mockReset();
    storeMocks.setGeometryEditAnnotationId.mockImplementation((id) => {
      storeMocks.geometryEditAnnotationId = id;
    });
  });

  it("enters geometry edit mode for an annotation", () => {
    const { result } = renderHook(() =>
      useMapGeometryEdit({
        annotations: [pinAnnotation],
        gameArea: DUBLIN_CITY_GAME_AREA,
        ensurePointInGameArea: vi.fn(() => true),
        setMapError: vi.fn(),
        updateAnnotation: vi.fn(async (annotation) => annotation),
      }),
    );

    act(() => {
      result.current.startGeometryEdit("ann-pin");
    });

    expect(storeMocks.setGeometryEditAnnotationId).toHaveBeenCalledWith("ann-pin");
    expect(storeMocks.setActiveTool).toHaveBeenCalledWith("none");
    expect(result.current.geometryEditAnnotation?.id).toBe("ann-pin");
  });

  it("updates point geometry from map clicks", () => {
    storeMocks.geometryEditAnnotationId = "ann-pin";
    const { result } = renderHook(() =>
      useMapGeometryEdit({
        annotations: [pinAnnotation],
        gameArea: DUBLIN_CITY_GAME_AREA,
        ensurePointInGameArea: vi.fn(() => true),
        setMapError: vi.fn(),
        updateAnnotation: vi.fn(async (annotation) => annotation),
      }),
    );

    act(() => {
      result.current.startGeometryEdit("ann-pin");
    });

    act(() => {
      result.current.handleGeometryEditClick([53.36, -6.27]);
    });

    expect(result.current.geometryDraft?.geometry).toEqual({
      type: "Point",
      coordinates: [-6.27, 53.36],
    });
  });
});
