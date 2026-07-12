import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePendingQuestionActions } from "./usePendingQuestionActions";

const firestoreMocks = vi.hoisted(() => ({
  writePendingQuestion: vi.fn(async () => undefined),
  writeSessionMessage: vi.fn(async () => undefined),
  updatePendingQuestion: vi.fn(async () => undefined),
  deletePendingQuestion: vi.fn(async () => undefined),
  postGameSystemMessage: vi.fn(async () => undefined),
  updateGameMessageAnswer: vi.fn(async () => undefined),
}));

vi.mock("../../services/firestore/firestoreSessionExtras", () => firestoreMocks);

describe("usePendingQuestionActions", () => {
  it("submits a pending question and chat message", async () => {
    const { result } = renderHook(() => usePendingQuestionActions());

    await act(async () => {
      await result.current.submitPendingQuestion({
        sessionId: "session-1",
        senderUid: "seeker-1",
        senderRole: "seeker",
        toolType: "radar",
        promptText: "Are you within 1 mile?",
        replyOptions: [
          { id: "yes", label: "Yes" },
          { id: "no", label: "No" },
        ],
        placement: { geometryJson: "{}" },
      });
    });

    expect(firestoreMocks.writePendingQuestion).toHaveBeenCalled();
    expect(firestoreMocks.writeSessionMessage).toHaveBeenCalled();
    expect(firestoreMocks.updatePendingQuestion).toHaveBeenCalled();
  });
});
