import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "../map/annotations";
import {
  countAnnotationUses,
  formatAnswerCountdown,
  formatDrawPickSummary,
  formatExpiredAnswerCountdown,
  hasOpenPendingQuestion,
  isQuestionAnswerDeadlineExpired,
  questionAnswerDeadlineMs,
  questionCostBreakdown,
  questionCostLabel,
} from "./questionRules";
import { answerDeadlineMs } from "../session/gameSizeRules";
import type { PendingQuestionRecord } from "../session/sessionChat";

describe("questionRules", () => {
  it("scales card costs by reuse count", () => {
    expect(questionCostLabel("D3P1", 0)).toBe("D3P1");
    expect(questionCostLabel("D3P1", 1)).toBe("D6P2");
    expect(questionCostLabel("D2P1", 1)).toBe("D4P2");
    expect(questionCostLabel("D4P2", 2)).toBe("D12P6");
    expect(questionCostLabel("D1P1", 0)).toBe("D1P1");
    expect(questionCostLabel("D1P1", 2)).toBe("D3P3");
  });

  it("returns cost breakdown with draw and keep counts", () => {
    expect(questionCostBreakdown("D2P1", 0)).toEqual({
      label: "D2P1",
      draw: 2,
      keep: 1,
    });
    expect(questionCostBreakdown("D3P1", 1)).toEqual({
      label: "D6P2",
      draw: 6,
      keep: 2,
    });
  });

  it("formats draw and pick summaries", () => {
    expect(formatDrawPickSummary(1, 1)).toBe("Draw 1, pick 1");
    expect(formatDrawPickSummary(2, 1)).toBe("Draw 2, pick 1");
    expect(formatDrawPickSummary(6, 2)).toBe("Draw 6, pick 2");
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

  it("uses photo answer deadlines by game size", () => {
    expect(questionAnswerDeadlineMs("photo", "small")).toBe(10 * 60 * 1000);
    expect(questionAnswerDeadlineMs("photo", "large")).toBe(20 * 60 * 1000);
  });

  it("uses photo answer deadlines from gameSizeRules", () => {
    expect(answerDeadlineMs("photo", "small")).toBe(10 * 60 * 1000);
    expect(answerDeadlineMs("photo", "medium")).toBe(10 * 60 * 1000);
    expect(answerDeadlineMs("photo", "large")).toBe(20 * 60 * 1000);
  });

  it("detects expired answer deadlines", () => {
    const answerableAt = "2026-01-01T00:00:00.000Z";
    const now = Date.parse("2026-01-01T00:06:00.000Z");
    expect(
      isQuestionAnswerDeadlineExpired(answerableAt, 5 * 60 * 1000, now),
    ).toBe(true);
    expect(
      formatExpiredAnswerCountdown(
        answerableAt,
        5 * 60 * 1000,
        undefined,
        now,
      ),
    ).toBe("Time expired — timer paused");
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
