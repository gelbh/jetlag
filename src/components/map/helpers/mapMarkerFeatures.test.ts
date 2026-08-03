import { describe, expect, it } from "vitest";
import {
  circleMarkerCollection,
  circleMarkerFeature,
  symbolMarkerFeature,
} from "./mapMarkerFeatures";

describe("mapMarkerFeatures", () => {
  it("builds circle marker features with hit metadata", () => {
    const feature = circleMarkerFeature({
      id: "a",
      lat: 53.3,
      lng: -6.2,
      radiusPx: 8,
      fillColor: "#111",
      borderColor: "#fff",
      hitId: "a",
      hitKind: "pin",
    });
    expect(feature.geometry.coordinates).toEqual([-6.2, 53.3]);
    expect(feature.properties?.hitId).toBe("a");
    expect(feature.properties?.radiusPx).toBe(8);
  });

  it("builds symbol marker features with icon and text props", () => {
    const feature = symbolMarkerFeature({
      id: "label-1",
      lat: 1,
      lng: 2,
      iconImage: "jl-icon-transit-rail",
      iconRotate: 45,
      text: "Start",
      textOffset: [0, -1],
    });
    expect(feature.properties?.iconImage).toBe("jl-icon-transit-rail");
    expect(feature.properties?.text).toBe("Start");
    expect(feature.properties?.textOffset).toEqual([0, -1]);
  });

  it("collects circle markers into a FeatureCollection", () => {
    const collection = circleMarkerCollection([
      {
        id: "one",
        lat: 0,
        lng: 0,
        radiusPx: 6,
        fillColor: "#000",
        borderColor: "#fff",
      },
    ]);
    expect(collection.features).toHaveLength(1);
  });
});
