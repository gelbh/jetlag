import { describe, expect, it } from "vitest";
import type { PendingQuestionRecord } from "../session/activity/sessionChat";
import { availableMatchingCategories } from "../session/catalog/sessionCatalogAvailability";
import {
  pickRandomizeOption,
  questionOptionsForTool,
  randomizedQuestionNotice,
  randomizeExcludeLabelsForPending,
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
  it("names the rolled option", () => {
    expect(randomizedQuestionNotice("matching", "Airport")).toBe(
      "Hider played Randomize. Ask this matching question instead: Airport.",
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
