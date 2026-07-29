import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  answerSummaryFromPendingReply,
  emitGameEndedActivity,
} from "./emitSessionActivity";
import {
  PHOTO_CANNOT_ANSWER_LABEL,
  PHOTO_REPLY_OPTIONS,
  PHOTO_SENT_EXTERNALLY_LABEL,
} from "../../domain/questions/photoQuestions";

const trackSessionEnded = vi.hoisted(() => vi.fn());
const appendSessionActivityEvent = vi.hoisted(() =>
  vi.fn(async () => ({ wrote: true })),
);

vi.mock("../core/analytics/analytics", () => ({
  trackSessionEnded,
}));

vi.mock("./sessionActivityLog", () => ({
  appendSessionActivityEvent,
}));

describe("answerSummaryFromPendingReply", () => {
  it("maps sent_externally object to Mark sent label", () => {
    expect(
      answerSummaryFromPendingReply(
        { kind: "sent_externally" },
        PHOTO_REPLY_OPTIONS,
      ),
    ).toBe(PHOTO_SENT_EXTERNALLY_LABEL);
  });

  it("maps cannot_answer object to cannot-answer label", () => {
    expect(
      answerSummaryFromPendingReply(
        { kind: "cannot_answer" },
        PHOTO_REPLY_OPTIONS,
      ),
    ).toBe(PHOTO_CANNOT_ANSWER_LABEL);
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
    expect(
      answerSummaryFromPendingReply({ kind: "sent_externally" }, []),
    ).not.toBe("[object Object]");
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
    expect(trackSessionEnded).toHaveBeenCalledWith("game_over");
  });

  it("tracks game_over for abandoned outcomes", () => {
    emitGameEndedActivity("session-1", { outcome: "abandoned" });
    expect(trackSessionEnded).toHaveBeenCalledWith("game_over");
  });

  it("does not track for ended_early (host end owns session_ended)", () => {
    emitGameEndedActivity("session-1", {
      outcome: "ended_early",
      summary: "Session ended",
    });
    expect(trackSessionEnded).not.toHaveBeenCalled();
  });
});
