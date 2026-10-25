import { act, renderHook } from "@testing-library/react";
import type { Polygon as GeoPolygon, MultiPolygon } from "geojson";
import { flushSync } from "react-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
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
  useAnnotationStore: vi.fn((selector: (state: typeof storeMocks) => unknown) =>
    selector(storeMocks),
  ),
  useMapStore: vi.fn(
    (selector: (state: { setActiveTool: typeof storeMocks.setActiveTool }) => unknown) =>
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

  it("refuses save and click when geometry-edit ID resolves to a tentacle", async () => {
    const sharedId = "ann-shared";
    const pin: AnnotationRecord = { ...pinAnnotation, id: sharedId };
    const tentacle: AnnotationRecord = {
      ...pinAnnotation,
      id: sharedId,
      type: "tentacle",
    };
    const updateAnnotation = vi.fn(async (_annotation: AnnotationRecord) => {});
    const ensurePointInGameArea = vi.fn(() => true);

    const { result, rerender } = renderHook(
      ({ annotations }: { annotations: AnnotationRecord[] }) =>
        useMapGeometryEdit({
          annotations,
          gameArea: DUBLIN_CITY_GAME_AREA,
          ensurePointInGameArea,
          setMapError: vi.fn(),
          updateAnnotation,
        }),
      { initialProps: { annotations: [pin] } },
    );

    act(() => {
      result.current.startGeometryEdit(sharedId);
    });
    act(() => {
      result.current.handleGeometryEditClick([53.36, -6.27]);
    });
    expect(result.current.geometryDraft?.geometry).toEqual({
      type: "Point",
      coordinates: [-6.27, 53.36],
    });

    // Exposed draft nulls with the annotation at the API boundary; effect clears store.
    await act(async () => {
      flushSync(() => {
        rerender({ annotations: [tentacle] });
      });
      expect(result.current.geometryEditAnnotation).toBeNull();
      expect(result.current.geometryDraft).toBeNull();
      expect(result.current.handleGeometryEditClick([53.37, -6.28])).toBe(false);
      await result.current.saveGeometryEdit();
    });

    expect(updateAnnotation).not.toHaveBeenCalled();
    expect(storeMocks.setGeometryEditAnnotationId).toHaveBeenCalledWith(null);
    expect(storeMocks.geometryEditAnnotationId).toBeNull();
    expect(result.current.geometryDraft).toBeNull();
  });

  describe("zone edits", () => {
    const square: GameArea = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    };

    function zoneAnnotation(geometry: GeoPolygon | MultiPolygon): AnnotationRecord {
      return {
        id: "ann-zone",
        sessionId: "local",
        type: "zone",
        status: "active",
        geometry: { type: "Feature", properties: {}, geometry },
        metadata: { createdAt: "2026-01-01T00:00:00.000Z" },
      };
    }

    function renderZoneEdit(annotation: AnnotationRecord) {
      storeMocks.geometryEditAnnotationId = annotation.id;
      const updateAnnotation = vi.fn(async (_annotation: AnnotationRecord) => {});
      const setMapError = vi.fn();
      const hook = renderHook(() =>
        useMapGeometryEdit({
          annotations: [annotation],
          gameArea: square,
          ensurePointInGameArea: vi.fn(() => false),
          setMapError,
          updateAnnotation,
        }),
      );
      act(() => {
        hook.result.current.startGeometryEdit(annotation.id);
      });
      return { ...hook, updateAnnotation, setMapError };
    }

    it("adds outside vertices and clips the saved zone", async () => {
      const { result, updateAnnotation } = renderZoneEdit(
        zoneAnnotation({
          type: "Polygon",
          coordinates: [
            [
              [0.2, 0.2],
              [0.8, 0.2],
              [0.8, 0.8],
              [0.2, 0.2],
            ],
          ],
        }),
      );

      act(() => {
        result.current.handleGeometryEditClick([0.5, 3]);
      });
      expect(result.current.geometryDraft?.geometry.type).toBe("Polygon");
      expect((result.current.geometryDraft?.geometry as GeoPolygon).coordinates[0]).toContainEqual([
        3, 0.5,
      ]);

      await act(async () => {
        await result.current.saveGeometryEdit();
      });

      expect(updateAnnotation).toHaveBeenCalledTimes(1);
      const saved = updateAnnotation.mock.calls[0]![0].geometry.geometry as
        | GeoPolygon
        | MultiPolygon;
      const positions =
        saved.type === "Polygon" ? saved.coordinates.flat() : saved.coordinates.flat(2);
      for (const [lng] of positions) {
        expect(lng).toBeLessThanOrEqual(1 + 1e-9);
      }
    });

    it("appends to the first part of a multi-part zone and keeps the rest", () => {
      const second = [
        [
          [0.6, 0.6],
          [0.9, 0.6],
          [0.9, 0.9],
          [0.6, 0.6],
        ],
      ];
      const { result } = renderZoneEdit(
        zoneAnnotation({
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [0.1, 0.1],
                [0.4, 0.1],
                [0.4, 0.4],
                [0.1, 0.1],
              ],
            ],
            second,
          ],
        }),
      );

      act(() => {
        result.current.handleGeometryEditClick([0.3, 0.05]);
      });

      expect(result.current.geometryDraft?.geometry).toEqual({
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0.1, 0.1],
              [0.4, 0.1],
              [0.4, 0.4],
              [0.05, 0.3],
              [0.1, 0.1],
            ],
          ],
          second,
        ],
      });
    });
  });
});
