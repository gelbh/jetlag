import { describe, expect, it } from "vitest";
import { questionOptionLabelsForTool, randomizedQuestionNotice } from "./randomizeQuestion";

describe("randomizedQuestionNotice", () => {
  it("names a question from the same category that the session allows", () => {
    const session = { gameSize: "small" as const };
    const labels = questionOptionLabelsForTool("matching", session);
    expect(labels.length).toBeGreaterThan(1);

    expect(randomizedQuestionNotice("matching", session, () => 0)).toBe(
      `Hider played Randomize. Ask this matching question instead: ${labels[0]}.`,
    );
    expect(randomizedQuestionNotice("matching", session, () => 0.9999)).toContain(
      labels[labels.length - 1]!,
    );
  });

  it("falls back to a generic notice when the category has no options", () => {
    expect(randomizedQuestionNotice("tentacle", { gameSize: "small" }, () => 0)).toBe(
      "Hider played Randomize. Ask a random tentacle question instead.",
    );
  });
});
