import { describe, expect, it } from "vitest";
import {
  pickRandomizeOptionLabel,
  questionOptionLabelsForTool,
  randomizedQuestionNotice,
} from "./randomizeQuestion";

describe("pickRandomizeOptionLabel", () => {
  it("excludes current and used labels from the pool", () => {
    const labels = ["A", "B", "C"];
    expect(
      pickRandomizeOptionLabel(labels, {
        exclude: new Set(["A", "C"]),
        random: () => 0,
      }),
    ).toBe("B");
  });

  it("returns null when every label is excluded", () => {
    expect(
      pickRandomizeOptionLabel(["A", "B"], {
        exclude: new Set(["A", "B"]),
        random: () => 0,
      }),
    ).toBeNull();
  });
});

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

  it("falls back when exclude empties the eligible pool", () => {
    const session = { gameSize: "small" as const };
    const labels = questionOptionLabelsForTool("matching", session);
    expect(
      randomizedQuestionNotice("matching", session, {
        exclude: new Set(labels),
        random: () => 0,
      }),
    ).toBe("Hider played Randomize. Ask a random matching question instead.");
  });

  it("picks only from labels outside the exclude set", () => {
    const session = { gameSize: "small" as const };
    const labels = questionOptionLabelsForTool("matching", session);
    expect(labels.length).toBeGreaterThan(2);
    const current = labels[0]!;
    const used = labels[1]!;
    const eligible = labels.filter((label) => label !== current && label !== used);
    const notice = randomizedQuestionNotice("matching", session, {
      exclude: new Set([current, used]),
      random: () => 0,
    });
    expect(notice).toBe(
      `Hider played Randomize. Ask this matching question instead: ${eligible[0]}.`,
    );
    for (const label of [current, used]) {
      expect(notice).not.toContain(`: ${label}.`);
    }
  });
});
