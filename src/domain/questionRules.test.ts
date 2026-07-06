import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "./annotations";
import {
  countAnnotationUses,
  formatAnswerCountdown,
  hasOpenPendingQuestion,
  questionAnswerDeadlineMs,
  questionCostLabel,
} from "./questionRules";
import type { PendingQuestionRecord } from "./sessionChat";

describe("questionRules", () => {
  it("scales card costs by reuse count", () => {
    expect(questionCostLabel("D3P1", 0)).toBe("D3P1");
    expect(questionCostLabel("D3P1", 1)).toBe("D6P2");
    expect(questionCostLabel("D2P1", 1)).toBe("D4P2");
    expect(questionCostLabel("D4P2", 2)).toBe("D12P6");
  });

  it("detects open pending questions", () => {
    const pending = [
      { status: "answered" },
      { status: "pending" },
    ] as PendingQuestionRecord[];
    expect(hasOpenPendingQuestion(pending)).toBe(true);
    expect(
      hasOpenPendingQuestion([{ status: "answered" }] as PendingQuestionRecord[]),
    ).toBe(false);
  });

  it("uses five minute answer deadlines for question tools", () => {
    expect(questionAnswerDeadlineMs("radar", "small")).toBe(5 * 60 * 1000);
    expect(questionAnswerDeadlineMs("matching", "large")).toBe(5 * 60 * 1000);
  });

  it("formats answer countdowns", () => {
    const now = Date.parse("2026-01-01T00:05:00.000Z");
    const answerableAt = "2026-01-01T00:00:00.000Z";
    expect(formatAnswerCountdown(undefined, 60_000, now)).toBeNull();
    expect(formatAnswerCountdown(answerableAt, 10 * 60 * 1000, now)).toBe(
      "5:00 remaining",
    );
    expect(formatAnswerCountdown(answerableAt, 5 * 60 * 1000, now)).toBe(
      "Time expired",
    );
  });

  it("counts annotation option uses", () => {
    const annotations = [
      { id: "a1", status: "active", metadata: { category: "museum" } },
      { id: "a2", status: "active", metadata: { category: "museum" } },
      { id: "a3", status: "removed", metadata: { category: "museum" } },
    ] as unknown as AnnotationRecord[];

    expect(
      countAnnotationUses(
        annotations,
        (a) => (a.metadata as { category?: string }).category ?? null,
        "museum",
      ),
    ).toBe(2);
    expect(
      countAnnotationUses(
        annotations,
        (a) => (a.metadata as { category?: string }).category ?? null,
        "museum",
        "a1",
      ),
    ).toBe(1);
  });
});
