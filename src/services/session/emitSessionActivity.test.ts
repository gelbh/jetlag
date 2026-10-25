import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PHOTO_CANNOT_ANSWER_LABEL,
  PHOTO_REPLY_OPTIONS,
  PHOTO_SENT_EXTERNALLY_LABEL,
} from "../../domain/questions/photoQuestions";
import {
  answerSummaryFromPendingReply,
  emitGameEndedActivity,
  emitQuestionAnsweredActivity,
} from "./emitSessionActivity";

const trackSessionEnded = vi.hoisted(() => vi.fn());
const trackLazy = vi.hoisted(() => vi.fn());
const appendSessionActivityEvent = vi.hoisted(() => vi.fn(async () => ({ wrote: true })));

vi.mock("../core/analytics/analytics", () => ({
  trackSessionEnded,
}));

vi.mock("../core/analytics/lazyTelemetry", () => ({ trackLazy }));

vi.mock("./sessionActivityLog", () => ({
  appendSessionActivityEvent,
}));

describe("answerSummaryFromPendingReply", () => {
  it("maps sent_externally object to Mark sent label", () => {
    expect(answerSummaryFromPendingReply({ kind: "sent_externally" }, PHOTO_REPLY_OPTIONS)).toBe(
      PHOTO_SENT_EXTERNALLY_LABEL,
    );
  });

  it("maps cannot_answer object to cannot-answer label", () => {
    expect(answerSummaryFromPendingReply({ kind: "cannot_answer" }, PHOTO_REPLY_OPTIONS)).toBe(
      PHOTO_CANNOT_ANSWER_LABEL,
    );
  });

  it("keeps Photo received for uploaded photo", () => {
    expect(
      answerSummaryFromPendingReply(
        { kind: "photo", storagePath: "sessions/s/pendingQuestions/q/p.jpg" },
        PHOTO_REPLY_OPTIONS,
      ),
    ).toBe("Photo received");
  });

  it("does not stringify plain objects as [object Object]", () => {
    expect(answerSummaryFromPendingReply({ kind: "sent_externally" }, [])).not.toBe(
      "[object Object]",
    );
  });
});

describe("emitGameEndedActivity analytics", () => {
  beforeEach(() => {
    trackSessionEnded.mockClear();
    appendSessionActivityEvent.mockClear();
  });

  it("tracks game_over for found outcomes", () => {
    emitGameEndedActivity("session-1", {
      outcome: "found",
      summary: "Hider found",
    });
    expect(trackSessionEnded).toHaveBeenCalledOnce();
    expect(trackSessionEnded).toHaveBeenCalledWith("game_over", { gameId: "session-1" });
  });

  it("tracks game_over for abandoned outcomes", () => {
    emitGameEndedActivity("session-1", { outcome: "abandoned" });
    expect(trackSessionEnded).toHaveBeenCalledWith("game_over", { gameId: "session-1" });
  });

  it("does not track for ended_early (host end owns session_ended)", () => {
    emitGameEndedActivity("session-1", {
      outcome: "ended_early",
      summary: "Session ended",
    });
    expect(trackSessionEnded).not.toHaveBeenCalled();
  });
});

describe("emitQuestionAnsweredActivity analytics", () => {
  beforeEach(() => {
    trackLazy.mockClear();
  });

  it("tracks a locally recorded answer as self_recorded", () => {
    emitQuestionAnsweredActivity({
      sessionId: "session-1",
      toolType: "radar",
      promptText: "Within 1 mile?",
      analyticsMode: "self_recorded",
    });
    expect(trackLazy).toHaveBeenCalledOnce();
    expect(trackLazy).toHaveBeenCalledWith("question_answered", {
      tool: "radar",
      mode: "self_recorded",
    });
  });

  it("does not track without an analytics mode", () => {
    emitQuestionAnsweredActivity({
      sessionId: "session-1",
      toolType: "radar",
      promptText: "Within 1 mile?",
    });
    expect(trackLazy).not.toHaveBeenCalled();
  });

  it("does not track answers resolved from a pending question", () => {
    emitQuestionAnsweredActivity({
      sessionId: "session-1",
      toolType: "radar",
      promptText: "Within 1 mile?",
      pendingQuestionId: "pq-1",
    });
    expect(trackLazy).not.toHaveBeenCalled();
  });
});
