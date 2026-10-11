import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bbox from "@turf/bbox";
import type { FeatureCollection } from "geojson";
import { describe, expect, it } from "vitest";
import { buildBundledGamePresets } from "./bundledGamePresets";
import type { RegionPackId } from "./regionPack";
import { getRegionPackConfig } from "./regionPackRegistry";
import { REGION_PACK_SUBREGION_REFERENCE_BBOXES } from "./subregionReferenceBboxes";

const publicRoot = resolve(import.meta.dirname, "../../../public");
const round = (value: number) => Math.round(value * 10_000) / 10_000;

describe("REGION_PACK_SUBREGION_REFERENCE_BBOXES", () => {
  it("matches the shipped primary boundary GeoJSON (rerun the generator on drift)", () => {
    for (const [packId, table] of Object.entries(REGION_PACK_SUBREGION_REFERENCE_BBOXES)) {
      const config = getRegionPackConfig(packId as RegionPackId);
      expect(config, packId).toBeDefined();
      const collection = JSON.parse(
        readFileSync(resolve(publicRoot, `.${config!.geoAssets.primary}`), "utf8"),
      ) as FeatureCollection;

      const expected: Record<string, { south: number; west: number; north: number; east: number }> =
        {};
      for (const feature of collection.features) {
        const id = feature.properties?.[config!.subregionPropertyKey];
        if (typeof id !== "string" || !id || !feature.geometry) {
          continue;
        }
        const [west, south, east, north] = bbox(feature);
        expected[id] = {
          south: round(south),
          west: round(west),
          north: round(north),
          east: round(east),
        };
      }
      expect(table, packId).toEqual(expected);
    }
  });

  it("covers every bundled subregion preset", () => {
    for (const preset of buildBundledGamePresets()) {
      if (preset.regionPackId && preset.subregionId) {
        expect(
          REGION_PACK_SUBREGION_REFERENCE_BBOXES[preset.regionPackId]?.[preset.subregionId],
          preset.id,
        ).toBeDefined();
      }
    }
  });
});
