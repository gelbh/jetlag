import { describe, expect, it } from "vitest";
import type { AnnotationRecord } from "../map/annotations";
import type { PendingQuestionRecord } from "../session/activity/sessionChat";
import { answerDeadlineMs } from "../session/size/gameSizeRules";
import {
  activeDeadlineAnchor,
  countAnnotationUses,
  formatAnswerCountdown,
  formatDrawPickSummary,
  formatExpiredAnswerCountdown,
  formatPendingDrawPickSummary,
  formatSequentialDrawPickSummary,
  hasOpenPendingQuestion,
  isAwaitingServerReceipt,
  isQuestionAnswerDeadlineExpired,
  isUsedOptionPendingQuestion,
  questionAnswerDeadlineMs,
  questionCostBreakdown,
  questionCostLabel,
  resolveDeadlineAnchor,
} from "./questionRules";

describe("isUsedOptionPendingQuestion", () => {
  it("counts pending and resolved", () => {
    expect(isUsedOptionPendingQuestion({ status: "pending" } as never)).toBe(true);
    expect(isUsedOptionPendingQuestion({ status: "resolved" } as never)).toBe(true);
  });

  it("counts cancelled only when an answer is present", () => {
    expect(
      isUsedOptionPendingQuestion({
        status: "cancelled",
        answer: "yes",
      } as never),
    ).toBe(true);
    expect(
      isUsedOptionPendingQuestion({
        status: "cancelled",
        answer: null,
      } as never),
    ).toBe(false);
  });

  it("counts cancelled with veto answer object as sticky used", () => {
    expect(
      isUsedOptionPendingQuestion({
        status: "cancelled",
        answer: { kind: "veto" },
      } as never),
    ).toBe(true);
  });
});

describe("questionRules", () => {
  it("scales card costs by reuse count", () => {
    expect(questionCostLabel("D3P1", 0)).toBe("D3P1");
    expect(questionCostLabel("D3P1", 1)).toBe("D3P1 ×2");
    expect(questionCostLabel("D2P1", 1)).toBe("D2P1 ×2");
    expect(questionCostLabel("D4P2", 2)).toBe("D4P2 ×3");
    expect(questionCostLabel("D1P1", 0)).toBe("D1P1");
    expect(questionCostLabel("D1P1", 2)).toBe("D1P1 ×3");
  });

  it("returns cost breakdown with draw and keep counts", () => {
    expect(questionCostBreakdown("D2P1", 0)).toEqual({
      label: "D2P1",
      draw: 2,
      keep: 1,
    });
    expect(questionCostBreakdown("D3P1", 1)).toEqual({
      label: "D3P1 ×2",
      draw: 6,
      keep: 2,
    });
  });

  it("formats draw and pick summaries", () => {
    expect(formatDrawPickSummary(1, 1)).toBe("Draw 1, pick 1");
    expect(formatDrawPickSummary(2, 1)).toBe("Draw 2, pick 1");
    expect(formatDrawPickSummary(6, 2)).toBe("Draw 6, pick 2");
    expect(formatSequentialDrawPickSummary("D3P1", 0)).toBe("Draw 3, pick 1");
    expect(formatSequentialDrawPickSummary("D3P1", 1)).toBe("Draw 3, pick 1 × 2");
    expect(formatPendingDrawPickSummary("radar", 2, 1)).toBe("Draw 2, pick 1");
    expect(formatPendingDrawPickSummary("radar", 4, 2)).toBe("Draw 2, pick 1 × 2");
    expect(formatPendingDrawPickSummary("tentacle", 4, 2)).toBe("Draw 4, pick 2");
  });

  it("detects open pending questions", () => {
    const pending = [{ status: "answered" }, { status: "pending" }] as PendingQuestionRecord[];
    expect(hasOpenPendingQuestion(pending)).toBe(true);
    expect(hasOpenPendingQuestion([{ status: "answered" }] as PendingQuestionRecord[])).toBe(false);
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
    expect(isQuestionAnswerDeadlineExpired(answerableAt, 5 * 60 * 1000, now)).toBe(true);
    expect(formatExpiredAnswerCountdown(answerableAt, 5 * 60 * 1000, undefined, now)).toBe(
      "Time expired. Timer paused.",
    );
  });

  it("formats answer countdowns", () => {
    const now = Date.parse("2026-01-01T00:05:00.000Z");
    const answerableAt = "2026-01-01T00:00:00.000Z";
    expect(formatAnswerCountdown(undefined, 60_000, now)).toBeNull();
    expect(formatAnswerCountdown(answerableAt, 10 * 60 * 1000, now)).toBe("5:00 remaining");
    expect(formatAnswerCountdown(answerableAt, 5 * 60 * 1000, now)).toBe("Time expired");
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

describe("resolveDeadlineAnchor", () => {
  it("uses the later of answerableAt and server receipt", () => {
    expect(
      resolveDeadlineAnchor({
        answerableAt: "2026-01-01T10:00:00.000Z",
        receivedAt: "2026-01-01T10:12:00.000Z",
      }),
    ).toBe("2026-01-01T10:12:00.000Z");
    expect(
      resolveDeadlineAnchor({
        answerableAt: "2026-01-01T10:00:05.000Z",
        receivedAt: "2026-01-01T10:00:00.000Z",
      }),
    ).toBe("2026-01-01T10:00:05.000Z");
    expect(resolveDeadlineAnchor({ answerableAt: "2026-01-01T10:00:00.000Z" })).toBe(
      "2026-01-01T10:00:00.000Z",
    );
    expect(resolveDeadlineAnchor({ receivedAt: "2026-01-01T10:12:00.000Z" })).toBe(
      "2026-01-01T10:12:00.000Z",
    );
    expect(resolveDeadlineAnchor({})).toBeUndefined();
  });
});

describe("isAwaitingServerReceipt", () => {
  it("is true only for a local unacked write the server has not stamped", () => {
    expect(isAwaitingServerReceipt({ pendingSync: true })).toBe(true);
    expect(
      isAwaitingServerReceipt({ pendingSync: true, receivedAt: "2026-01-01T10:00:00.000Z" }),
    ).toBe(false);
    expect(isAwaitingServerReceipt({})).toBe(false);
  });
});

describe("activeDeadlineAnchor", () => {
  it("withholds the anchor while the ask is queued, then uses the later anchor", () => {
    const asked = { answerableAt: "2026-01-01T10:00:00.000Z" };
    expect(activeDeadlineAnchor({ ...asked, pendingSync: true })).toBeUndefined();
    expect(activeDeadlineAnchor(asked)).toBe("2026-01-01T10:00:00.000Z");
    expect(activeDeadlineAnchor({ ...asked, receivedAt: "2026-01-01T10:05:00.000Z" })).toBe(
      "2026-01-01T10:05:00.000Z",
    );
  });
});
