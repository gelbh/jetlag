import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SUBMIT_DOUBLE_TAP_COOLDOWN_MS,
  usePendingQuestionActions,
} from "./usePendingQuestionActions";

const firestoreMocks = vi.hoisted(() => ({
  writeAskedQuestionBatch: vi.fn(async () => undefined),
  writePendingQuestionUpdateBatch: vi.fn(async () => undefined),
  postGameSystemMessage: vi.fn(async () => undefined),
  buildGameSystemMessage: (
    sessionId: string,
    senderUid: string,
    senderRole: string,
    text: string,
    id: string,
    createdAt: string,
  ) => ({ id, sessionId, channel: "game", senderUid, senderRole, createdAt, kind: "system", text }),
  getPendingQuestionStatus: vi.fn(async () => "walking"),
  THERMOMETER_WALK_CANCEL_TEXT: {
    left: "Thermometer walk cancelled — seeker left.",
    orphan: "Thermometer walk cancelled — seeker left the session.",
    stale: "Thermometer walk cancelled — walk went stale.",
    manual: "Thermometer walk cancelled.",
  },
}));

vi.mock("@/services/firestore/firestoreSessionExtras", () => firestoreMocks);

// Never resolves: proves nothing in the hook waits on a server ack.
const commitWriteMock = vi.hoisted(() =>
  vi.fn((_label: string, run: () => Promise<void>) => {
    void run();
    return { acknowledged: new Promise<void>(() => {}) };
  }),
);

vi.mock("@/services/firestore/commitWrite", () => ({ commitWrite: commitWriteMock }));

vi.mock("@/services/core/time/serverClock", () => ({
  serverNowIso: () => "2026-01-01T10:00:00.000Z",
}));

const activityMocks = vi.hoisted(() => ({
  emitQuestionCancelledActivity: vi.fn(),
  emitQuestionAskedActivity: vi.fn(),
  emitPhotoAskedActivity: vi.fn(),
  emitThermometerWalkStartedActivity: vi.fn(),
  emitThermometerWalkSeparatedActivity: vi.fn(),
  isAnnotationQuestionTool: (toolType: string) => toolType !== "photo",
}));

vi.mock("@/services/session/emitSessionActivity", () => activityMocks);

const radarAsk = {
  sessionId: "session-1",
  senderUid: "seeker-1",
  senderRole: "seeker" as const,
  toolType: "radar" as const,
  promptText: "Are you within 1 mile?",
  replyOptions: [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ],
  placement: { geometryJson: "{}", metadata: {} },
};

describe("usePendingQuestionActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("drops a double tap but accepts a deliberate second ask after the cooldown", () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => usePendingQuestionActions());

      let first: string | undefined;
      let doubleTap: string | undefined;
      act(() => {
        first = result.current.submitPendingQuestion(radarAsk);
        doubleTap = result.current.submitPendingQuestion(radarAsk);
      });
      expect(first).toEqual(expect.any(String));
      expect(doubleTap).toBeUndefined();

      vi.advanceTimersByTime(SUBMIT_DOUBLE_TAP_COOLDOWN_MS);
      let later: string | undefined;
      act(() => {
        later = result.current.submitPendingQuestion(radarAsk);
      });
      expect(later).toEqual(expect.any(String));
      expect(firestoreMocks.writeAskedQuestionBatch).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("completes a walk in one batch that stamps server receipt for the hider's window", () => {
    const { result } = renderHook(() => usePendingQuestionActions());

    act(() => {
      result.current.completeThermometerWalk({
        sessionId: "session-1",
        pendingQuestionId: "pq-walk",
        senderUid: "seeker-1",
        senderRole: "seeker",
        startPoint: [53.35, -6.26],
        endPoint: [53.36, -6.26],
        distanceMeters: 1000,
        promptText: "Hotter or colder?",
        replyOptions: [],
      });
    });

    expect(commitWriteMock).toHaveBeenCalledWith("question.ask", expect.any(Function));
    expect(firestoreMocks.writePendingQuestionUpdateBatch).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({
        questionId: "pq-walk",
        stampReceivedAt: true,
        questionPatch: expect.objectContaining({
          status: "pending",
          answerableAt: "2026-01-01T10:00:00.000Z",
        }),
        newMessage: expect.objectContaining({ kind: "question", pendingQuestionId: "pq-walk" }),
      }),
    );
    expect(activityMocks.emitThermometerWalkSeparatedActivity).toHaveBeenCalled();
  });

  it("asks with one batched question + chat row on server-clock time, without awaiting ack", () => {
    const { result } = renderHook(() => usePendingQuestionActions());

    let questionId: string | undefined;
    act(() => {
      questionId = result.current.submitPendingQuestion(radarAsk);
    });

    expect(questionId).toEqual(expect.any(String));
    expect(commitWriteMock).toHaveBeenCalledWith("question.ask", expect.any(Function));
    expect(firestoreMocks.writeAskedQuestionBatch).toHaveBeenCalledTimes(1);
    expect(firestoreMocks.writeAskedQuestionBatch).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({
        id: questionId,
        status: "pending",
        createdAt: "2026-01-01T10:00:00.000Z",
        answerableAt: "2026-01-01T10:00:00.000Z",
      }),
      expect.objectContaining({
        kind: "question",
        pendingQuestionId: questionId,
        status: "pending",
        createdAt: "2026-01-01T10:00:00.000Z",
      }),
    );
    expect(activityMocks.emitQuestionAskedActivity).toHaveBeenCalledWith(
      expect.objectContaining({ pendingQuestionId: questionId, toolType: "radar" }),
    );
  });

  it("starts a walking thermometer as one batch with a system row and no answer window", () => {
    const { result } = renderHook(() => usePendingQuestionActions());

    act(() => {
      result.current.submitPendingQuestion({
        ...radarAsk,
        toolType: "thermometer",
        status: "walking",
        promptText: "Thermometer walk started",
        replyOptions: [],
      });
    });

    const [, question, message] = firestoreMocks.writeAskedQuestionBatch.mock
      .calls[0] as unknown as [string, Record<string, unknown>, Record<string, unknown>];
    expect(question.status).toBe("walking");
    expect(question).not.toHaveProperty("answerableAt");
    expect(message).toMatchObject({ kind: "system", text: "Thermometer walk started" });
    expect(activityMocks.emitThermometerWalkStartedActivity).toHaveBeenCalled();
  });

  it("answers in one batch and adds the late notice when the deadline expired", () => {
    const { result } = renderHook(() => usePendingQuestionActions());

    act(() => {
      result.current.answerPendingQuestion("session-1", "pq-1", "msg-1", "yes", "yes", {
        deadlineExpired: true,
        senderUid: "hider-1",
        senderRole: "hider",
      });
    });

    expect(commitWriteMock).toHaveBeenCalledWith("question.answer", expect.any(Function));
    expect(firestoreMocks.writePendingQuestionUpdateBatch).toHaveBeenCalledWith("session-1", {
      questionId: "pq-1",
      questionPatch: { answer: "yes", status: "answered", answeredLate: true },
      gameMessage: { id: "msg-1", patch: { selectedReply: "yes", status: "answered" } },
      newMessage: expect.objectContaining({
        kind: "system",
        senderUid: "hider-1",
        text: "Answer received late. Hider forfeits card draw for this question.",
      }),
    });
  });

  it("cancels a thermometer walk and its announcement atomically", async () => {
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

    expect(commitWriteMock).toHaveBeenCalledWith("question.cancel", expect.any(Function));
    expect(firestoreMocks.writePendingQuestionUpdateBatch).toHaveBeenCalledWith("session-1", {
      questionId: "pq-1",
      questionPatch: { status: "cancelled" },
      newMessage: expect.objectContaining({
        kind: "system",
        senderUid: "host-1",
        text: "Thermometer walk cancelled.",
      }),
    });
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

    expect(firestoreMocks.writePendingQuestionUpdateBatch).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({ newMessage: expect.objectContaining({ text }) }),
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

    expect(commitWriteMock).not.toHaveBeenCalled();
    expect(firestoreMocks.writePendingQuestionUpdateBatch).not.toHaveBeenCalled();
  });

  it("dismisses an expired pending question in one batch", async () => {
    firestoreMocks.getPendingQuestionStatus.mockResolvedValueOnce("pending");
    const { result } = renderHook(() => usePendingQuestionActions());

    await act(async () => {
      await result.current.dismissExpiredPendingQuestion({
        sessionId: "session-1",
        pendingQuestionId: "pq-1",
        messageId: "msg-1",
        senderUid: "seeker-1",
        senderRole: "seeker",
        toolType: "radar",
        promptText: "Are you within 1 mile?",
      });
    });

    expect(firestoreMocks.writePendingQuestionUpdateBatch).toHaveBeenCalledWith("session-1", {
      questionId: "pq-1",
      questionPatch: { status: "cancelled" },
      gameMessage: { id: "msg-1", patch: { status: "cancelled" } },
      newMessage: expect.objectContaining({
        text: "Expired question dismissed. You can ask again.",
      }),
    });
    expect(activityMocks.emitQuestionCancelledActivity).toHaveBeenCalledWith({
      sessionId: "session-1",
      toolType: "radar",
      promptText: "Are you within 1 mile?",
      pendingQuestionId: "pq-1",
      createdByUid: "seeker-1",
    });
  });

  it("veto cancel writes sticky answer and selectedReply in one batch", () => {
    const { result } = renderHook(() => usePendingQuestionActions());

    act(() => {
      result.current.cancelPendingQuestionWithCard({
        sessionId: "session-1",
        pendingQuestionId: "pq-1",
        messageId: "msg-1",
        senderUid: "hider-1",
        notice: "Hider played Veto.",
        card: "veto",
      });
    });

    expect(commitWriteMock).toHaveBeenCalledWith("question.cancel", expect.any(Function));
    expect(firestoreMocks.writePendingQuestionUpdateBatch).toHaveBeenCalledWith("session-1", {
      questionId: "pq-1",
      questionPatch: { status: "cancelled", answer: { kind: "veto" } },
      gameMessage: {
        id: "msg-1",
        patch: { status: "cancelled", selectedReply: "veto" },
      },
      newMessage: expect.objectContaining({
        kind: "system",
        senderUid: "hider-1",
        senderRole: "hider",
        text: "Hider played Veto.",
      }),
    });
  });

  it("randomize cancel stays status-only", () => {
    const { result } = renderHook(() => usePendingQuestionActions());

    act(() => {
      result.current.cancelPendingQuestionWithCard({
        sessionId: "session-1",
        pendingQuestionId: "pq-1",
        messageId: "msg-1",
        senderUid: "hider-1",
        notice: "Hider played Randomize.",
        card: "randomize",
      });
    });

    expect(firestoreMocks.writePendingQuestionUpdateBatch).toHaveBeenCalledWith("session-1", {
      questionId: "pq-1",
      questionPatch: { status: "cancelled" },
      gameMessage: { id: "msg-1", patch: { status: "cancelled" } },
      newMessage: expect.objectContaining({ text: "Hider played Randomize." }),
    });
  });
});
