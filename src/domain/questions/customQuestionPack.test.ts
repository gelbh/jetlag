import { describe, expect, it } from "vitest";
import {
  CUSTOM_QUESTION_PACK_PREFIX,
  isCustomPackMatchingCategoryId,
  isCustomPackMeasuringFromKind,
  isCustomQuestionPackCategoryId,
  resolveCustomPackMatchingCategory,
  resolveCustomPackMeasuringOption,
} from "./customQuestionPack";

describe("customQuestionPack", () => {
  it("detects pack-prefixed category ids", () => {
    expect(isCustomQuestionPackCategoryId("pack:major_city")).toBe(true);
    expect(isCustomQuestionPackCategoryId("museum")).toBe(false);
  });

  it("detects pack matching category ids", () => {
    expect(isCustomPackMatchingCategoryId("pack:letter_zone")).toBe(true);
    expect(isCustomPackMatchingCategoryId("pack:unknown")).toBe(false);
  });

  it("detects pack measuring kinds", () => {
    expect(isCustomPackMeasuringFromKind("pack:mcdonalds")).toBe(true);
    expect(isCustomPackMeasuringFromKind("commercial_airport")).toBe(false);
  });

  it("resolves pack matching categories", () => {
    const category = resolveCustomPackMatchingCategory(
      `${CUSTOM_QUESTION_PACK_PREFIX}major_city`,
    );
    expect(category?.label).toBe("Major city");
    expect(resolveCustomPackMatchingCategory("museum")).toBeNull();
  });

  it("resolves pack measuring options", () => {
    const option = resolveCustomPackMeasuringOption(
      `${CUSTOM_QUESTION_PACK_PREFIX}seven_eleven`,
    );
    expect(option?.label).toBe("7-Eleven");
    expect(resolveCustomPackMeasuringOption("body_of_water")).toBeNull();
  });
});
