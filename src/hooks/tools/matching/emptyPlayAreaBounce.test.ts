import { describe, expect, it } from "vitest";
import { matchingEmptyPlayAreaMessage } from "@/services/geo/matching";
import {
  isMatchingEmptyPlayAreaCatalog,
  isMatchingPinMissWithFeatures,
  markMatchingCategoryUnavailable,
} from "./emptyPlayAreaBounce";

describe("emptyPlayAreaBounce", () => {
  it("marks category unavailable and reopens catalog on empty play area", () => {
    const empty = {
      nullAnswer: true,
      featureCount: 0,
      nearestFeatureId: null as string | null,
    };
    expect(isMatchingEmptyPlayAreaCatalog(empty)).toBe(true);
    expect(isMatchingPinMissWithFeatures(empty)).toBe(false);

    const { unavailableMatchingCategories, catalogNotice } =
      markMatchingCategoryUnavailable(new Map(), "landmass");

    // After resolve returns empty for landmass, draft should land here:
    // categoryChosen === false (via reopenCategoryPicker), unavailable has
    // landmass, catalogNotice set, and no submitPendingQuestion call.
    expect(unavailableMatchingCategories.get("landmass")).toBe(
      matchingEmptyPlayAreaMessage("landmass"),
    );
    expect(catalogNotice).toBe(matchingEmptyPlayAreaMessage("landmass"));
    expect(catalogNotice).not.toMatch(/null match/i);
  });

  it("does not treat pin-miss with features as empty play area", () => {
    const pinMiss = {
      nullAnswer: false,
      featureCount: 3,
      nearestFeatureId: null as string | null,
    };
    expect(isMatchingEmptyPlayAreaCatalog(pinMiss)).toBe(false);
    expect(isMatchingPinMissWithFeatures(pinMiss)).toBe(true);
  });
});
