import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePendingQuestionActions } from "./usePendingQuestionActions";

const firestoreMocks = vi.hoisted(() => ({
  writePendingQuestion: vi.fn(async () => undefined),
  writeSessionMessage: vi.fn(async () => undefined),
  updatePendingQuestion: vi.fn(async () => undefined),
  deletePendingQuestion: vi.fn(async () => undefined),
  postGameSystemMessage: vi.fn(async () => undefined),
  updateGameMessageAnswer: vi.fn(async () => undefined),
  getPendingQuestionStatus: vi.fn(async () => "walking"),
  THERMOMETER_WALK_CANCEL_TEXT: {
    left: "Thermometer walk cancelled — seeker left.",
    orphan: "Thermometer walk cancelled — seeker left the session.",
    manual: "Thermometer walk cancelled.",
  },
}));

vi.mock("../../services/firestore/firestoreSessionExtras", () => firestoreMocks);

describe("usePendingQuestionActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
        placement: { geometryJson: "{}", metadata: {} },
      });
    });

    expect(firestoreMocks.writePendingQuestion).toHaveBeenCalled();
    expect(firestoreMocks.writeSessionMessage).toHaveBeenCalled();
    expect(firestoreMocks.updatePendingQuestion).toHaveBeenCalled();
  });

  it("cancels a thermometer walk and posts a system message", async () => {
    const { result } = renderHook(() => usePendingQuestionActions());

    await act(async () => {
      await result.current.cancelThermometerWalk({
        sessionId: "session-1",
        pendingQuestionId: "pq-1",
        senderUid: "host-1",
        senderRole: "seeker",
        reason: "manual",
      });
    });

    expect(firestoreMocks.updatePendingQuestion).toHaveBeenCalledWith(
      "session-1",
      "pq-1",
      { status: "cancelled" },
    );
    expect(firestoreMocks.postGameSystemMessage).toHaveBeenCalledWith(
      "session-1",
      "host-1",
      "seeker",
      "Thermometer walk cancelled.",
      expect.any(String),
    );
  });

  it.each([
    {
      reason: "left" as const,
      text: "Thermometer walk cancelled — seeker left.",
    },
    {
      reason: "orphan" as const,
      text: "Thermometer walk cancelled — seeker left the session.",
    },
  ])("posts $reason cancel announcement text", async ({ reason, text }) => {
    const { result } = renderHook(() => usePendingQuestionActions());

    await act(async () => {
      await result.current.cancelThermometerWalk({
        sessionId: "session-1",
        pendingQuestionId: "pq-1",
        senderUid: "host-1",
        senderRole: "seeker",
        reason,
      });
    });

    expect(firestoreMocks.postGameSystemMessage).toHaveBeenCalledWith(
      "session-1",
      "host-1",
      "seeker",
      text,
      expect.any(String),
    );
  });

  it("skips cancel and announce when the walk is already cancelled", async () => {
    firestoreMocks.getPendingQuestionStatus.mockResolvedValueOnce("cancelled");
    const { result } = renderHook(() => usePendingQuestionActions());

    await act(async () => {
      await result.current.cancelThermometerWalk({
        sessionId: "session-1",
        pendingQuestionId: "pq-1",
        senderUid: "host-1",
        senderRole: "seeker",
        reason: "manual",
      });
    });

    expect(firestoreMocks.updatePendingQuestion).not.toHaveBeenCalled();
    expect(firestoreMocks.postGameSystemMessage).not.toHaveBeenCalled();
  });

  it("does not post a system message when cancel update fails", async () => {
    firestoreMocks.updatePendingQuestion.mockRejectedValueOnce(
      new Error("permission-denied"),
    );
    const { result } = renderHook(() => usePendingQuestionActions());

    await expect(
      act(async () => {
        await result.current.cancelThermometerWalk({
          sessionId: "session-1",
          pendingQuestionId: "pq-1",
          senderUid: "host-1",
          senderRole: "seeker",
          reason: "left",
        });
      }),
    ).rejects.toThrow("permission-denied");

    expect(firestoreMocks.postGameSystemMessage).not.toHaveBeenCalled();
  });
});
