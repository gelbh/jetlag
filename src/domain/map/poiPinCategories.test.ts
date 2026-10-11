import { describe, expect, it } from "vitest";
import { createTestPinAnnotation } from "../../test/fixtures/sessions";
import { MATCHING_CATEGORIES } from "../questions/matching/matchingCatalog";
import { MEASURING_CATALOG } from "../questions/measuring/measuringCatalog";
import { TENTACLE_LOCATION_CATEGORY_IDS } from "../questions/tentacleQuestions";
import { POI_PIN_CATEGORIES, type PoiPinCategoryId, poiPinsForCategory } from "./poiPinCategories";

function pin(id: string, poiCategory?: PoiPinCategoryId, status: "active" | "deleted" = "active") {
  const base = createTestPinAnnotation();
  return createTestPinAnnotation({
    id,
    status,
    metadata: { ...base.metadata, label: `Pin ${id}`, poiCategory },
  });
}

describe("poiPinsForCategory", () => {
  it("returns active pins tagged with the category as lat/lng places", () => {
    const annotations = [
      pin("zoo-1", "zoo"),
      pin("untagged"),
      pin("museum-1", "museum"),
      pin("zoo-deleted", "zoo", "deleted"),
      { ...pin("radar-zoo", "zoo"), type: "radar" as const },
    ];

    expect(poiPinsForCategory(annotations, "zoo")).toEqual([
      { id: "zoo-1", name: "Pin zoo-1", point: [53.35, -6.26] },
    ]);
  });
});

describe("POI_PIN_CATEGORIES", () => {
  it("only lists ids that a Tentacle, Measuring, or Matching catalog uses", () => {
    const known = new Set<string>([
      ...TENTACLE_LOCATION_CATEGORY_IDS,
      "zoo",
      "aquarium",
      "amusement_park",
      ...MEASURING_CATALOG.map((option) => option.id),
      ...MATCHING_CATEGORIES.map((category) => category.id),
    ]);

    expect(POI_PIN_CATEGORIES.length).toBeGreaterThan(0);
    for (const category of POI_PIN_CATEGORIES) {
      expect(known.has(category.id)).toBe(true);
      expect(category.label).toBeTruthy();
    }
    expect(POI_PIN_CATEGORIES.map((c) => c.id)).not.toContain("body_of_water");
    expect(POI_PIN_CATEGORIES.map((c) => c.id)).not.toContain("custom_place");
  });
});
