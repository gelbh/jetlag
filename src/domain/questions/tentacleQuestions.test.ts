import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "../map/annotations";
import type { SessionRulesInput } from "../session/sessionRules";
import {
  defaultTentacleCategoryId,
  defaultTentacleCategoryIdForSession,
  firstAvailableTentacleCategoryId,
  getTentacleLocationCategory,
  isTentacleCategoryAvailable,
  isTentacleCategoryAvailableInSession,
  readTentacleCategoryFromPending,
  tentacleAnswerLabel,
  tentacleCategoriesForGameSize,
  tentacleCategoriesForSession,
  tentacleCategoryUseCount,
  tentacleCategoryUseCountFromPending,
  tentacleHiderAnswerClipboardText,
  tentacleQuestionPrompt,
  tentacleSearchRadiusMeters,
  type TentacleExtendedCategoryId,
  usedTentacleCategoryIds,
} from "./tentacleQuestions";

function tentacleAnnotation(
  id: string,
  categoryId: TentacleExtendedCategoryId,
  status: AnnotationRecord["status"] = "active",
): AnnotationRecord {
  return {
    id,
    sessionId: "local",
    type: "tentacle",
    status,
    geometry: {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [0, 0] },
    },
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z",
      tentacleCategoryId: categoryId,
      radiusMeters: 1609,
    },
  };
}

describe("tentacleQuestions", () => {
  it("lists categories by game size", () => {
    expect(tentacleCategoriesForGameSize("small").map((item) => item.id)).toEqual(
      [],
    );
    expect(tentacleCategoriesForGameSize("medium").length).toBeGreaterThan(0);
    expect(tentacleCategoriesForGameSize("large").length).toBeGreaterThan(
      tentacleCategoriesForGameSize("medium").length,
    );
  });

  it("reports tentacle availability by game size", () => {
    expect(isTentacleCategoryAvailable("small", "museum")).toBe(false);
    expect(isTentacleCategoryAvailable("medium", "museum")).toBe(true);
    expect(isTentacleCategoryAvailable("large", "metro_line")).toBe(true);
  });

  it("picks the first unused tentacle category", () => {
    const used = new Set(["museum"] as const);
    expect(firstAvailableTentacleCategoryId("medium", used)).not.toBe("museum");
    expect(defaultTentacleCategoryId("medium", used)).toBeTruthy();
  });

  it("tracks used tentacle categories from active annotations", () => {
    const museum = tentacleAnnotation("t-1", "museum");
    const zoo = tentacleAnnotation("t-2", "zoo");
    const deleted = tentacleAnnotation("t-3", "aquarium", "deleted");

    expect(usedTentacleCategoryIds([museum, zoo, deleted])).toEqual(
      new Set(["museum", "zoo"]),
    );
    expect(usedTentacleCategoryIds([museum, zoo], "t-1")).toEqual(
      new Set(["zoo"]),
    );
  });

  it("counts category reuse from annotations and pending questions", () => {
    const annotations = [tentacleAnnotation("t-1", "museum")];
    expect(tentacleCategoryUseCount(annotations, "museum")).toBe(1);
    expect(tentacleCategoryUseCount(annotations, "museum", "t-1")).toBe(0);

    const pending = [
      {
        id: "pq-1",
        sessionId: "session-1",
        toolType: "tentacle" as const,
        createdByUid: "seeker",
        createdAt: "2026-01-01T00:00:00.000Z",
        status: "pending" as const,
        placement: {
          geometryJson: "{}",
          metadata: { tentacleCategoryId: "museum" },
        },
        replyOptions: [],
        promptText: "Tentacle question",
      },
    ];
    expect(tentacleCategoryUseCountFromPending(pending, "museum")).toBe(1);
    expect(readTentacleCategoryFromPending(pending[0]!)).toBe("museum");
  });

  it("builds prompts and clipboard text with formatted distance", () => {
    const radiusMeters = tentacleSearchRadiusMeters("museum", "medium");
    const prompt = tentacleQuestionPrompt("museum", "imperial", radiusMeters);
    expect(prompt).toMatch(/Within .* of me, which museum are you nearest to/i);

    const clipboard = tentacleHiderAnswerClipboardText(
      "museum",
      "imperial",
      [{ name: "City Museum" }],
      radiusMeters,
    );
    expect(clipboard).toContain("City Museum");
    expect(clipboard).toMatch(/Not within reach/i);
  });

  it("resolves answer labels for poi and out-of-reach annotations", () => {
    const answered = tentacleAnnotation("t-1", "museum");
    answered.metadata.highlightedPoiId = "poi-1";
    answered.metadata.tentacleAnswerPoiName = "City Museum";

    expect(tentacleAnswerLabel(answered)).toBe("City Museum");

    const outOfReach = tentacleAnnotation("t-2", "museum");
    outOfReach.metadata.tentacleOutOfReach = true;
    expect(tentacleAnswerLabel(outOfReach)).toMatch(/Not within reach/i);
  });

  it("resolves session-specific defaults and availability", () => {
    const session: SessionRulesInput = {
      gameSize: "medium",
      customCategories: [
        {
          id: "custom:landmark",
          label: "Landmark",
          promptNoun: "landmark",
          overpassSelectors: ['["tourism"="attraction"]'],
        },
      ],
    };

    expect(isTentacleCategoryAvailableInSession(session, "museum")).toBe(true);
    expect(
      tentacleCategoriesForSession(session).some(
        (category) => category.id === "custom:landmark",
      ),
    ).toBe(true);
    expect(defaultTentacleCategoryIdForSession(session)).toBeTruthy();
    expect(getTentacleLocationCategory("zoo").label).toBe("Zoo");
  });
});
