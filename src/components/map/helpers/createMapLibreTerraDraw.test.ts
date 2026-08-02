import { describe, expect, it } from "vitest";
import type { Feature, Polygon } from "geojson";
import {
  fromTerraDrawSnapshot,
  toTerraDrawFeatures,
} from "./createMapLibreTerraDraw";

const polygon: Feature<Polygon> = {
  type: "Feature",
  properties: { label: "zone" },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-6.3, 53.3],
        [-6.2, 53.3],
        [-6.2, 53.4],
        [-6.3, 53.4],
        [-6.3, 53.3],
      ],
    ],
  },
};

describe("createMapLibreTerraDraw GeoJSON round-trip", () => {
  it("stamps mode for Terra Draw and strips it on snapshot readback", () => {
    const prepared = toTerraDrawFeatures([polygon], "polygon");
    expect(prepared).toHaveLength(1);
    expect(prepared[0].properties).toMatchObject({
      label: "zone",
      mode: "polygon",
    });
    expect(prepared[0].geometry).toEqual(polygon.geometry);

    const roundTripped = fromTerraDrawSnapshot(prepared);
    expect(roundTripped).toHaveLength(1);
    expect(roundTripped[0].properties).toEqual({ label: "zone" });
    expect(roundTripped[0].geometry).toEqual(polygon.geometry);
  });
});
