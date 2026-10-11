import { describe, expect, it } from "vitest";
import { createTestPinAnnotation } from "../../test/fixtures/sessions";
import { MATCHING_CATEGORIES } from "../questions/matching/matchingCatalog";
import { TENTACLE_LOCATION_CATEGORY_IDS } from "../questions/tentacleQuestions";
import {
  POI_PIN_CATEGORIES,
  type PoiPinCategoryId,
  parsePoiPinCategory,
  poiPinCategoryLabel,
  poiPinsForCategory,
} from "./poiPinCategories";

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
  it("covers every Tentacle and Matching point category", () => {
    const ids = POI_PIN_CATEGORIES.map((category) => category.id);
    const pointCategoryIds = [
      ...TENTACLE_LOCATION_CATEGORY_IDS,
      "zoo",
      "aquarium",
      "amusement_park",
      ...MATCHING_CATEGORIES.filter((category) => category.resolver === "overpassPoint").map(
        (category) => category.id,
      ),
    ];

    expect(ids).toEqual(expect.arrayContaining(pointCategoryIds));
    expect(ids).not.toContain("body_of_water");
  });

  it("parses and labels known ids only", () => {
    expect(parsePoiPinCategory("zoo")).toBe("zoo");
    expect(parsePoiPinCategory("volcano")).toBeUndefined();
    expect(poiPinCategoryLabel("zoo")).toBeTruthy();
    expect(poiPinCategoryLabel(undefined)).toBeUndefined();
  });
});
