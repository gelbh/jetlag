import { describe, expect, it } from "vitest";
import {
  defaultPhotoCategoryId,
  firstAvailablePhotoCategoryId,
  parsePhotoAnswer,
  photoAnswerSelectedReply,
  photoCategoriesForGameSize,
  photoCategoryUseCount,
  photoQuestionPrompt,
  usedPhotoCategoryIds,
} from "./photoQuestions";
import type { PendingQuestionRecord } from "../session/sessionChat";

function photoPending(
  overrides: Partial<PendingQuestionRecord> = {},
): PendingQuestionRecord {
  return {
    id: "pq-1",
    sessionId: "session-1",
    toolType: "photo",
    createdByUid: "seeker-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "resolved",
    placement: {
      geometryJson: "{}",
      metadata: { photoCategoryId: "tree" },
    },
    replyOptions: [],
    promptText: "Send me a photo of a tree.",
    ...overrides,
  };
}

describe("photoQuestions", () => {
  it("gates categories by game size", () => {
    expect(photoCategoriesForGameSize("small")).toHaveLength(6);
    expect(photoCategoriesForGameSize("medium")).toHaveLength(14);
    expect(photoCategoriesForGameSize("large")).toHaveLength(18);
  });

  it("builds official prompt text", () => {
    expect(photoQuestionPrompt("tree")).toBe("Send me a photo of a tree.");
    expect(photoQuestionPrompt("five_buildings")).toBe(
      "Send me a photo of 5 buildings.",
    );
  });

  it("tracks used categories from pending questions", () => {
    const pending = [
      photoPending({ id: "pq-1", status: "resolved" }),
      photoPending({
        id: "pq-2",
        status: "pending",
        placement: {
          geometryJson: "{}",
          metadata: { photoCategoryId: "you" },
        },
      }),
      photoPending({
        id: "pq-3",
        toolType: "radar",
        status: "resolved",
      }),
    ];

    expect(usedPhotoCategoryIds(pending)).toEqual(new Set(["tree", "you"]));
    expect(photoCategoryUseCount(pending, "tree")).toBe(1);
    expect(firstAvailablePhotoCategoryId("small", usedPhotoCategoryIds(pending))).not.toBe(
      "tree",
    );
    expect(defaultPhotoCategoryId("small", usedPhotoCategoryIds(pending))).not.toBe(
      "tree",
    );
  });

  it("parses photo answers", () => {
    expect(parsePhotoAnswer({ kind: "cannot_answer" })).toEqual({
      kind: "cannot_answer",
    });
    expect(
      parsePhotoAnswer({
        kind: "photo",
        storagePath: "sessions/a/photoAnswers/q/file.jpg",
      }),
    ).toEqual({
      kind: "photo",
      storagePath: "sessions/a/photoAnswers/q/file.jpg",
    });
    expect(photoAnswerSelectedReply({ kind: "cannot_answer" })).toBe(
      "cannot_answer",
    );
    expect(
      photoAnswerSelectedReply({
        kind: "photo",
        storagePath: "sessions/a/photoAnswers/q/file.jpg",
      }),
    ).toBe("photo");
  });
});
