import { describe, expect, it } from "vitest";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import { pathOptionsToMapLibrePaint } from "./pathOptionsToMapLibrePaint";

describe("pathOptionsToMapLibrePaint", () => {
  it("maps fill-only stroke:false layers", () => {
    expect(
      pathOptionsToMapLibrePaint({
        stroke: false,
        fillColor: MAP_ANNOTATION_COLORS.elimination,
        fillOpacity: 0.28,
      }),
    ).toEqual({
      fill: {
        fillColor: MAP_ANNOTATION_COLORS.elimination,
        fillOpacity: 0.28,
      },
      line: null,
    });
  });

  it("maps stroked layers with color", () => {
    expect(
      pathOptionsToMapLibrePaint({
        stroke: true,
        color: MAP_ANNOTATION_COLORS.strokeLight,
        weight: 2,
        opacity: 0.6,
        fillColor: MAP_ANNOTATION_COLORS.elimination,
        fillOpacity: 0.5,
      }),
    ).toEqual({
      fill: {
        fillColor: MAP_ANNOTATION_COLORS.elimination,
        fillOpacity: 0.5,
      },
      line: {
        color: MAP_ANNOTATION_COLORS.strokeLight,
        width: 2,
        opacity: 0.6,
      },
    });
  });

  it("omits line when stroke enabled but color missing", () => {
    expect(
      pathOptionsToMapLibrePaint({
        stroke: true,
        fillColor: MAP_ANNOTATION_COLORS.elimination,
      }),
    ).toEqual({
      fill: {
        fillColor: MAP_ANNOTATION_COLORS.elimination,
        fillOpacity: 0.35,
      },
      line: null,
    });
  });
});
