import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "../map/annotations";
import type { PendingQuestionRecord } from "../session/sessionChat";
import { buildCatalogHelpers } from "./catalogHelpers";

type TestOption = "a" | "b" | "c";

const TEST_CATALOG = [{ id: "a" as const }, { id: "b" as const }, { id: "c" as const }];

const helpers = buildCatalogHelpers<TestOption>({
  toolType: "matching",
  readOptionFromAnnotation: (annotation) => {
    if (annotation.type !== "matching") {
      return null;
    }
    return (annotation.metadata.matchingCategory as TestOption | undefined) ?? null;
  },
  readOptionFromPending: (question) => {
    if (question.toolType !== "matching") {
      return null;
    }
    const categoryId = question.placement.metadata.matchingCategory;
    return typeof categoryId === "string" ? (categoryId as TestOption) : null;
  },
});

function matchingAnnotation(
  id: string,
  category: TestOption,
  status: AnnotationRecord["status"] = "active",
): AnnotationRecord {
  return {
    id,
    type: "matching",
    status,
    createdAt: 0,
    metadata: { matchingCategory: category },
  } as unknown as AnnotationRecord;
}

function matchingPending(
  id: string,
  category: TestOption,
  status: PendingQuestionRecord["status"] = "pending",
): PendingQuestionRecord {
  return {
    id,
    toolType: "matching",
    status,
    placement: { metadata: { matchingCategory: category } },
  } as unknown as PendingQuestionRecord;
}

describe("buildCatalogHelpers", () => {
  it("returns empty used set for no annotations", () => {
    expect(helpers.usedOptionsFromAnnotations([])).toEqual(new Set());
  });

  it("collects used options from active annotations", () => {
    const used = helpers.usedOptionsFromAnnotations([
      matchingAnnotation("1", "a"),
      matchingAnnotation("2", "b"),
      matchingAnnotation("3", "a", "deleted"),
    ]);
    expect(used).toEqual(new Set(["a", "b"]));
  });

  it("excludes exceptAnnotationId from used set", () => {
    const used = helpers.usedOptionsFromAnnotations(
      [matchingAnnotation("1", "a"), matchingAnnotation("2", "b")],
      "1",
    );
    expect(used).toEqual(new Set(["b"]));
  });

  it("returns first unused catalog option", () => {
    expect(helpers.firstAvailableFromCatalog(TEST_CATALOG, new Set(["a"]))).toBe(
      "b",
    );
  });

  it("returns null when all catalog options are used", () => {
    expect(
      helpers.firstAvailableFromCatalog(
        TEST_CATALOG,
        new Set(["a", "b", "c"]),
      ),
    ).toBeNull();
  });

  it("respects isEnabled filter for first available", () => {
    expect(
      helpers.firstAvailableFromCatalog(TEST_CATALOG, new Set(), (option) =>
        option !== "a",
      ),
    ).toBe("b");
  });

  it("returns fallback when catalog is fully used", () => {
    expect(
      helpers.defaultFromCatalog(
        TEST_CATALOG,
        new Set(["a", "b", "c"]),
        "a",
      ),
    ).toBe("a");
  });

  it("counts annotation use for a single option", () => {
    expect(
      helpers.optionUseCountFromAnnotations(
        [
          matchingAnnotation("1", "a"),
          matchingAnnotation("2", "a"),
          matchingAnnotation("3", "b"),
        ],
        "a",
      ),
    ).toBe(2);
  });

  it("counts pending use for a single option", () => {
    expect(
      helpers.optionUseCountFromPending(
        [
          matchingPending("1", "a"),
          matchingPending("2", "a", "cancelled"),
          matchingPending("3", "b"),
        ],
        "a",
      ),
    ).toBe(1);
  });
});
