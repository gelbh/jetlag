import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import { usePendingQuestionResolver } from "./usePendingQuestionResolver";

const updatePendingQuestion = vi.fn();
const createAnnotation = vi.fn();

vi.mock("../../services/firestore/firestoreSessionExtras", () => ({
  updatePendingQuestion: (...args: unknown[]) => updatePendingQuestion(...args),
}));

const gameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
  ],
};

const photoPending: PendingQuestionRecord = {
  id: "pq-photo",
  sessionId: "session-1",
  toolType: "photo",
  createdByUid: "seeker-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  status: "answered",
  placement: {
    geometryJson: "{}",
    metadata: { photoCategoryId: "tree" },
  },
  replyOptions: [],
  promptText: "Send me a photo of a tree.",
  answer: {
    kind: "photo",
    storagePath: "sessions/session-1/photoAnswers/pq-photo/photo.jpg",
  },
};

describe("usePendingQuestionResolver", () => {
  it("resolves photo questions without creating annotations", async () => {
    updatePendingQuestion.mockResolvedValue(undefined);
    createAnnotation.mockResolvedValue({ id: "ann-1" } as AnnotationRecord);

    renderHook(() =>
      usePendingQuestionResolver({
        sessionId: "session-1",
        enabled: true,
        pendingQuestions: [photoPending],
        createAnnotation,
        gameArea,
      }),
    );

    await waitFor(() => {
      expect(updatePendingQuestion).toHaveBeenCalledWith(
        "session-1",
        "pq-photo",
        { status: "resolved" },
      );
    });

    expect(createAnnotation).not.toHaveBeenCalled();
  });
});
