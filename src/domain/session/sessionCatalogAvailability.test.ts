import { describe, expect, it } from "vitest";
import {
  assertBaseCatalogIntegrity,
  availableMatchingCategories,
  availableMeasuringCatalog,
  BASE_MATCHING_CATEGORY_COUNT,
  BASE_MEASURING_CATALOG_COUNT,
  isCategoryInDefaultPicker,
} from "./sessionCatalogAvailability";
import { isCustomQuestionPackCategoryId } from "../questions/customQuestionPack";

describe("sessionCatalogAvailability", () => {
  it("keeps base catalog counts aligned with official defaults", () => {
    const integrity = assertBaseCatalogIntegrity();
    expect(integrity.matchingCount).toBe(BASE_MATCHING_CATEGORY_COUNT);
    expect(integrity.measuringCount).toBe(BASE_MEASURING_CATALOG_COUNT);
  });

  it("excludes custom pack categories from default sessions", () => {
    const defaultSession = { gameSize: "medium" as const };
    const matchingIds = availableMatchingCategories(defaultSession).map(
      (category) => category.id,
    );
    const measuringIds = availableMeasuringCatalog(defaultSession).map(
      (option) => option.id,
    );

    expect(matchingIds.some((id) => isCustomQuestionPackCategoryId(id))).toBe(
      false,
    );
    expect(measuringIds.some((id) => isCustomQuestionPackCategoryId(id))).toBe(
      false,
    );
  });

  it("includes custom pack categories when the host enables the pack", () => {
    const session = {
      gameSize: "medium" as const,
      customQuestionPackEnabled: true,
    };

    expect(
      availableMatchingCategories(session).some((category) =>
        isCustomQuestionPackCategoryId(category.id),
      ),
    ).toBe(true);
    expect(
      availableMeasuringCatalog(session).some((option) =>
        isCustomQuestionPackCategoryId(option.id),
      ),
    ).toBe(true);
  });

  it("gates pack categories in the default picker helper", () => {
    expect(
      isCategoryInDefaultPicker("pack:seven_eleven", { gameSize: "medium" }),
    ).toBe(false);
    expect(
      isCategoryInDefaultPicker("pack:seven_eleven", {
        gameSize: "medium",
        customQuestionPackEnabled: true,
      }),
    ).toBe(true);
    expect(
      isCategoryInDefaultPicker("commercial_airport", { gameSize: "medium" }),
    ).toBe(true);
  });
});
