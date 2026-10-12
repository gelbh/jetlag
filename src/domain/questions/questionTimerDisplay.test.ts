import { describe, expect, it } from "vitest";
import type { PendingQuestionRecord } from "../session/activity/sessionChat";
import { questionAnswerDeadlineMs } from "./questionRules";
import { hasOpenQuestionCountdown, selectPrimaryQuestionTimer } from "./questionTimerDisplay";

const rules = { gameSize: "medium" } as const;
const T0 = Date.parse("2026-01-01T10:00:00.000Z");

function question(overrides: Partial<PendingQuestionRecord> = {}): PendingQuestionRecord {
  return {
    id: "pq-1",
    sessionId: "session-1",
    toolType: "radar",
    createdByUid: "seeker-1",
    createdAt: "2026-01-01T10:00:00.000Z",
    status: "pending",
    placement: { geometryJson: "{}", metadata: {} },
    replyOptions: [],
    promptText: "Radar",
    answerableAt: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("selectPrimaryQuestionTimer", () => {
  it("counts down from server receipt when the ask synced late", () => {
    const deadlineMs = questionAnswerDeadlineMs("radar", rules);
    const timer = selectPrimaryQuestionTimer(
      [question({ receivedAt: "2026-01-01T10:12:00.000Z" })],
      rules,
      T0 + 12 * 60_000,
    );

    expect(timer?.remainingMs).toBe(deadlineMs);
  });

  it("shows no countdown while the ask is still queued on this device", () => {
    expect(
      selectPrimaryQuestionTimer([question({ pendingSync: true })], rules, T0 + 60_000),
    ).toBeNull();
  });
});

describe("hasOpenQuestionCountdown", () => {
  it("is true for a pending question with a deadline anchor", () => {
    expect(hasOpenQuestionCountdown([question()])).toBe(true);
  });

  it("is false for walking, unanchored, and answered questions", () => {
    expect(hasOpenQuestionCountdown([question({ status: "walking" })])).toBe(false);
    expect(hasOpenQuestionCountdown([question({ pendingSync: true })])).toBe(false);
    expect(hasOpenQuestionCountdown([question({ status: "answered" })])).toBe(false);
  });
});
