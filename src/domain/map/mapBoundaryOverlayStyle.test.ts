import { describe, expect, it } from "vitest";
import { MAP_ANNOTATION_COLORS } from "./mapAnnotationColors";
import {
  getAdminBoundaryStrokeStyle,
  getBoundaryPreviewStyle,
} from "./mapBoundaryOverlayStyle";

describe("getAdminBoundaryStrokeStyle", () => {
  it("uses strokeLight on dark standard street basemap", () => {
    const style = getAdminBoundaryStrokeStyle(8, "standard", "dark");

    expect(style.color).toBe(MAP_ANNOTATION_COLORS.strokeLight);
  });

  it("uses boundary color on light standard street basemap", () => {
    const style = getAdminBoundaryStrokeStyle(8, "standard", "light");

    expect(style.color).toBe(MAP_ANNOTATION_COLORS.boundary);
  });
});

describe("getBoundaryPreviewStyle", () => {
  it("uses strokeLight colors on dark standard street basemap", () => {
    const style = getBoundaryPreviewStyle("standard", "dark");

    expect(style).toEqual({
      color: MAP_ANNOTATION_COLORS.strokeLight,
      fillColor: MAP_ANNOTATION_COLORS.strokeLight,
      fillOpacity: 0.12,
      weight: 1,
    });
  });

  it("uses boundary color on light standard street basemap", () => {
    const style = getBoundaryPreviewStyle("standard", "light");

    expect(style).toEqual({
      color: MAP_ANNOTATION_COLORS.boundary,
      fillColor: MAP_ANNOTATION_COLORS.boundary,
      fillOpacity: 0.15,
      weight: 0,
    });
  });
});
