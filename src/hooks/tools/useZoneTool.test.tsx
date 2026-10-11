import { act, renderHook } from "@testing-library/react";
import type { Polygon as GeoPolygon, MultiPolygon } from "geojson";
import { describe, expect, it } from "vitest";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import type { GameArea } from "../../domain/map/annotations";
import { createToolHookMocks } from "../../test/helpers/toolHookMocks";
import { useZoneTool } from "./useZoneTool";

describe("useZoneTool", () => {
  it("collects polygon vertices from map taps", () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useZoneTool({
        active: true,
        createAnnotation: mocks.createAnnotation,
        finishPlacement: mocks.finishPlacement,
        gameArea: null,
        setMapError: mocks.setMapError,
      }),
    );

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
      result.current.handleMapClick([53.36, -6.25]);
    });

    expect(result.current.draft.zoneVertices).toHaveLength(2);
  });

  it("creates a zone annotation after closing the polygon", async () => {
    const mocks = createToolHookMocks();
    const { result } = renderHook(() =>
      useZoneTool({
        active: true,
        createAnnotation: mocks.createAnnotation,
        finishPlacement: mocks.finishPlacement,
        gameArea: null,
        setMapError: mocks.setMapError,
      }),
    );

    act(() => {
      result.current.handleMapClick([53.35, -6.26]);
      result.current.handleMapClick([53.36, -6.25]);
      result.current.handleMapClick([53.34, -6.24]);
      result.current.panel.props.onLabelChange("Search zone");
    });

    await act(async () => {
      await result.current.panel.props.onClosePolygon();
    });

    expect(mocks.createAnnotation).toHaveBeenCalledWith(expect.objectContaining({ type: "zone" }));
  });

  describe("clipping to the play area", () => {
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

    async function drawZone(points: LatLngTuple[]) {
      const mocks = createToolHookMocks();
      const { result } = renderHook(() =>
        useZoneTool({
          active: true,
          createAnnotation: mocks.createAnnotation,
          finishPlacement: mocks.finishPlacement,
          gameArea: square,
          setMapError: mocks.setMapError,
        }),
      );
      act(() => {
        for (const point of points) {
          result.current.handleMapClick(point);
        }
      });
      await act(async () => {
        await result.current.panel.props.onClosePolygon();
      });
      return mocks;
    }

    function expectInsideSquare(mocks: ReturnType<typeof createToolHookMocks>) {
      expect(mocks.createAnnotation).toHaveBeenCalledTimes(1);
      const saved = mocks.createAnnotation.mock.calls[0]![0].geometry.geometry as
        | GeoPolygon
        | MultiPolygon;
      const positions =
        saved.type === "Polygon" ? saved.coordinates.flat() : saved.coordinates.flat(2);
      for (const [lng, lat] of positions) {
        expect(lng).toBeGreaterThanOrEqual(-1e-9);
        expect(lng).toBeLessThanOrEqual(1 + 1e-9);
        expect(lat).toBeGreaterThanOrEqual(-1e-9);
        expect(lat).toBeLessThanOrEqual(1 + 1e-9);
      }
    }

    it("trims vertices outside the play area", async () => {
      const mocks = await drawZone([
        [0.5, 0.5],
        [0.5, 2],
        [2, 2],
        [2, 0.5],
      ]);
      expectInsideSquare(mocks);
    });

    it("refuses a zone that misses the play area", async () => {
      const mocks = await drawZone([
        [2, 2],
        [2, 3],
        [3, 3],
      ]);
      expect(mocks.createAnnotation).not.toHaveBeenCalled();
      expect(mocks.setMapError).toHaveBeenCalledWith("That zone doesn't overlap the play area.");
    });

    it("clips a self-intersecting zone", async () => {
      const mocks = await drawZone([
        [0.2, 0.2],
        [2, 2],
        [0.2, 2],
        [2, 0.2],
      ]);
      expectInsideSquare(mocks);
    });
  });
});
