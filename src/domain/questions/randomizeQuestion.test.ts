import { describe, expect, it } from "vitest";
import type { PendingQuestionRecord } from "../session/activity/sessionChat";
import { availableMatchingCategories } from "../session/catalog/sessionCatalogAvailability";
import {
  pickRandomizeOption,
  questionOptionsForTool,
  randomizedQuestionNotice,
  randomizeExcludeLabelsForPending,
  randomizeManualNotice,
} from "./randomizeQuestion";

function matchingPending(
  id: string,
  category: string,
  status: PendingQuestionRecord["status"] = "pending",
  answer?: unknown,
): PendingQuestionRecord {
  return {
    id,
    toolType: "matching",
    status,
    answer,
    placement: { metadata: { matchingCategory: category } },
  } as unknown as PendingQuestionRecord;
}

describe("questionOptionsForTool", () => {
  it("keys radar and thermometer options by meters", () => {
    const session = { gameSize: "small" as const };
    for (const tool of ["radar", "thermometer"] as const) {
      const options = questionOptionsForTool(tool, session);
      expect(options.length).toBeGreaterThan(0);
      for (const option of options) {
        expect(typeof option.optionKey).toBe("number");
      }
    }
  });

  it("keys string-id tools by catalog id", () => {
    const session = { gameSize: "small" as const };
    expect(questionOptionsForTool("matching", session)).toEqual(
      availableMatchingCategories(session).map((category) => ({
        optionKey: category.id,
        label: category.label,
      })),
    );
  });
});

describe("pickRandomizeOption", () => {
  const session = { gameSize: "small" as const };

  it("skips the current option", () => {
    const options = questionOptionsForTool("matching", session);
    const current = matchingPending("pq-1", String(options[0]!.optionKey));
    expect(pickRandomizeOption(current, session, [], [current], () => 0)).toEqual(options[1]);
  });

  it("skips options already used this session", () => {
    const options = questionOptionsForTool("matching", session);
    const current = matchingPending("pq-1", String(options[0]!.optionKey));
    const used = matchingPending("pq-0", String(options[1]!.optionKey), "answered", "yes");
    expect(pickRandomizeOption(current, session, [], [used, current], () => 0)).toEqual(options[2]);
  });

  it("returns null when every option is current or used", () => {
    const options = questionOptionsForTool("matching", session);
    const pending = options.map((option, index) =>
      matchingPending(`pq-${index}`, String(option.optionKey)),
    );
    expect(pickRandomizeOption(pending[0]!, session, [], pending, () => 0)).toBeNull();
  });
});

describe("randomizedQuestionNotice", () => {
  it("says the question is being sent for auto-ask tools", () => {
    expect(randomizedQuestionNotice("radar", "1 mi")).toBe(
      "Hider played Randomize. Sending: 1 mi.",
    );
    expect(randomizedQuestionNotice("photo", "A tree")).toBe(
      "Hider played Randomize. Sending: A tree.",
    );
    expect(randomizedQuestionNotice("matching", "Airport")).toBe(
      "Hider played Randomize. Sending: Airport.",
    );
    expect(randomizedQuestionNotice("tentacle", "Museum")).toBe(
      "Hider played Randomize. Sending: Museum.",
    );
    expect(randomizedQuestionNotice("measuring", "Sea level")).toBe(
      "Hider played Randomize. Sending: Sea level.",
    );
  });

  it("asks for a new walk on thermometer", () => {
    expect(randomizedQuestionNotice("thermometer", "1 mi")).toBe(
      "Hider played Randomize. Walk the 1 mi thermometer instead.",
    );
  });
});

describe("randomizeManualNotice", () => {
  it("tells the seeker to ask it from the tool", () => {
    expect(randomizeManualNotice("Airport")).toBe(
      "Randomize rolled Airport. Could not build it automatically; ask it from the tool.",
    );
  });
});

describe("randomizeExcludeLabelsForPending", () => {
  it("excludes current option and sticky-used veto labels for the tool", () => {
    const session = { gameSize: "small" as const };
    const current = matchingPending("pq-current", "landmass");
    const vetoed = matchingPending("pq-veto", "park", "cancelled", { kind: "veto" });
    const exclude = randomizeExcludeLabelsForPending(current, session, [], [current, vetoed]);

    expect(exclude.has("Landmass")).toBe(true);
    expect(exclude.has("Park")).toBe(true);

    const picked = pickRandomizeOption(current, session, [], [current, vetoed], () => 0);
    expect(picked).not.toBeNull();
    expect(picked?.label).not.toBe("Landmass");
    expect(picked?.label).not.toBe("Park");
  });
});

describe("play-area presence exclusion", () => {
  it("omits denylisted measuring ids for the region pack", () => {
    const session = { gameSize: "small" as const, regionPackId: "dublin" as const };
    const keys = questionOptionsForTool("measuring", session).map((option) => option.optionKey);
    expect(keys).not.toContain("high_speed_rail_line");
  });

  it("keeps denylisted measuring ids when the pack allows them", () => {
    const session = { gameSize: "small" as const, regionPackId: "tokyo" as const };
    const keys = questionOptionsForTool("measuring", session).map((option) => option.optionKey);
    expect(keys).toContain("high_speed_rail_line");
  });

  it("omits matching ids with probe count 0", () => {
    const session = { gameSize: "small" as const, regionPackId: "london" as const };
    const presence = { categoryPresenceCounts: { museum: 0, zoo: 4 } };
    const keys = questionOptionsForTool("matching", session, presence).map(
      (option) => option.optionKey,
    );
    expect(keys).not.toContain("museum");
    expect(keys).toContain("zoo");
  });

  it("does not omit probe-empty ids while presence counts are still pending", () => {
    const session = { gameSize: "small" as const, regionPackId: "london" as const };
    const keys = questionOptionsForTool("matching", session, {
      categoryPresenceCounts: null,
    }).map((option) => option.optionKey);
    expect(keys).toContain("museum");
  });

  it("omits tentacle ids marked admin-unavailable", () => {
    const session = { gameSize: "large" as const, regionPackId: "london" as const };
    const presence = {
      categoryPresenceCounts: {} as Record<string, number>,
      isAdminUnavailable: (categoryId: string) => categoryId === "museum",
    };
    const keys = questionOptionsForTool("tentacle", session, presence).map(
      (option) => option.optionKey,
    );
    expect(keys).not.toContain("museum");
  });

  it("pickRandomizeOption never rolls a probe-empty matching id", () => {
    const session = { gameSize: "small" as const, regionPackId: "london" as const };
    const presence = { categoryPresenceCounts: { museum: 0 } };
    const options = questionOptionsForTool("matching", session, presence);
    const current = matchingPending("pq-1", String(options[0]!.optionKey));
    const picked = pickRandomizeOption(current, session, [], [current], () => 0, presence);
    expect(picked?.optionKey).not.toBe("museum");
    expect(options.map((option) => option.optionKey)).not.toContain("museum");
  });
});
