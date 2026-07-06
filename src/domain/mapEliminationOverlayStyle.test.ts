import { describe, expect, it } from "vitest";
import { MAP_ANNOTATION_COLORS } from "./mapAnnotationColors";
import { getEliminationOverlayLayers } from "./mapEliminationOverlayStyle";

describe("getEliminationOverlayLayers", () => {
  it("returns a single dark fill layer on standard map", () => {
    const layers = getEliminationOverlayLayers("standard");

    expect(layers).toHaveLength(1);
    expect(layers[0]).toEqual({
      stroke: false,
      fillColor: MAP_ANNOTATION_COLORS.elimination,
      fillOpacity: 0.35,
    });
  });

  it("returns white underlay plus stroked dark overlay on satellite", () => {
    const layers = getEliminationOverlayLayers("satellite");

    expect(layers).toHaveLength(2);
    expect(layers[0]).toEqual({
      stroke: false,
      fillColor: MAP_ANNOTATION_COLORS.strokeLight,
      fillOpacity: 0.28,
    });
    expect(layers[1]).toEqual({
      stroke: true,
      color: MAP_ANNOTATION_COLORS.strokeLight,
      weight: 1,
      opacity: 0.6,
      fillColor: MAP_ANNOTATION_COLORS.elimination,
      fillOpacity: 0.52,
    });
  });
});
