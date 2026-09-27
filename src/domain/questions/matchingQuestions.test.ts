import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "../map/annotations";
import {
  firstAvailableMatchingCategoryId,
  isMatchingCategoryAvailable,
  usedMatchingCategoryIds,
  usedMatchingCategoryIdsForSession,
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
    expect(isMatchingCategoryAvailable("commercial_airport")).toBe(true);
    expect(isMatchingCategoryAvailable("station_name_length")).toBe(true);
  });

  it("marks landmass used from pending and cancelled-with-answer", () => {
    const pending = {
      id: "pq-land",
      toolType: "matching",
      status: "pending",
      placement: { metadata: { matchingCategory: "landmass" } },
    } as never;
    expect(usedMatchingCategoryIdsForSession([], [pending])).toEqual(
      new Set(["landmass"]),
    );

    const cancelled = {
      ...pending,
      status: "cancelled",
      answer: "yes",
    };
    expect(usedMatchingCategoryIdsForSession([], [cancelled])).toEqual(
      new Set(["landmass"]),
    );
  });
});
