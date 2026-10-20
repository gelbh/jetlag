import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MATCHING_CATEGORIES } from "@/domain/questions/matching/matchingCatalog";
import type { MeasuringFromKind } from "@/domain/questions/measuringQuestions";
import { PACK_GEO_POINT_CATEGORIES } from "@/domain/regions/packGeoManifest";
import { resolveMeasuringCatalogOption } from "@/domain/session/catalog/sessionCustomCatalog";

const packGeoPointCategoryIds = new Set<string>(PACK_GEO_POINT_CATEGORIES);

describe("matching pack parity guardrails", () => {
  it("does not reintroduce BUNDLED_MATCHING_CATEGORIES in fetch.ts", () => {
    const source = readFileSync(resolve(import.meta.dirname, "fetch.ts"), "utf8");
    expect(source).not.toContain("BUNDLED_MATCHING_CATEGORIES");
  });

  it("resolves measuring catalog options for pack-backed matching point categories", () => {
    const packBackedMatchingPointIds = MATCHING_CATEGORIES.filter(
      (category) =>
        category.resolver === "overpassPoint" && packGeoPointCategoryIds.has(category.id),
    ).map((category) => category.id);

    expect(packBackedMatchingPointIds.length).toBeGreaterThan(0);

    for (const categoryId of packBackedMatchingPointIds) {
      expect(
        resolveMeasuringCatalogOption(categoryId as MeasuringFromKind, []),
        categoryId,
      ).toBeDefined();
    }
  });
});
