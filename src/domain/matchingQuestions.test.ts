import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "./annotations";
import {
  firstAvailableMatchingCategoryId,
  isMatchingCategoryAvailable,
  usedMatchingCategoryIds,
} from "./matchingQuestions";

function matchingAnnotation(
  id: string,
  categoryId: AnnotationRecord["metadata"]["matchingCategory"],
): AnnotationRecord {
  return {
    id,
    sessionId: "local",
    type: "matching",
    status: "active",
    geometry: {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [0, 0] },
    },
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z",
      matchingCategory: categoryId,
      matchingAnswer: "yes",
    },
  };
}

describe("matchingQuestions", () => {
  it("tracks used matching categories from active annotations", () => {
    const airport = matchingAnnotation("match-airport", "commercial_airport");
    const park = matchingAnnotation("match-park", "park");

    expect(usedMatchingCategoryIds([airport, park])).toEqual(
      new Set(["commercial_airport", "park"]),
    );
    expect(usedMatchingCategoryIds([airport, park], "match-airport")).toEqual(
      new Set(["park"]),
    );
  });

  it("skips inactive matching annotations when tracking used categories", () => {
    const active = matchingAnnotation("match-active", "commercial_airport");
    const inactive: AnnotationRecord = {
      ...matchingAnnotation("match-inactive", "park"),
      status: "deleted",
    };

    expect(usedMatchingCategoryIds([active, inactive])).toEqual(
      new Set(["commercial_airport"]),
    );
  });

  it("picks the first enabled category that is not already used", () => {
    const used = new Set(["commercial_airport", "transit_line"] as const);

    expect(firstAvailableMatchingCategoryId(used)).toBe("station_name_length");
    expect(isMatchingCategoryAvailable("commercial_airport", used)).toBe(false);
    expect(isMatchingCategoryAvailable("station_name_length", used)).toBe(true);
  });
});
