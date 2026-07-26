import { describe, expect, it } from "vitest";
import { answerSummaryFromPendingReply } from "./emitSessionActivity";
import {
  PHOTO_CANNOT_ANSWER_LABEL,
  PHOTO_REPLY_OPTIONS,
  PHOTO_SENT_EXTERNALLY_LABEL,
} from "../../domain/questions/photoQuestions";

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
