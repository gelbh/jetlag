import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import { useCancelOrphanThermometerWalks } from "./useCancelOrphanThermometerWalks";

function walkingQuestion(
  overrides: Partial<PendingQuestionRecord> = {},
): PendingQuestionRecord {
  return {
    id: "pq-orphan",
    sessionId: "session-1",
    toolType: "thermometer",
    createdByUid: "gone-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "walking",
    placement: { geometryJson: "{}", metadata: {} },
    replyOptions: [],
    promptText: "Thermometer walk started",
    ...overrides,
  };
}

describe("useCancelOrphanThermometerWalks", () => {
  const cancelThermometerWalk = vi.fn(async () => undefined);

  beforeEach(() => {
    cancelThermometerWalk.mockClear();
  });

  it("cancels orphan walking thermometers once for seekers", async () => {
    const { rerender } = renderHook(
      ({ pendingQuestions, memberUids }) =>
        useCancelOrphanThermometerWalks({
          sessionId: "session-1",
          myUid: "seeker-2",
          myRole: "seeker",
          memberUids,
          pendingQuestions,
          cancelThermometerWalk,
        }),
      {
        initialProps: {
          pendingQuestions: [walkingQuestion()] as PendingQuestionRecord[],
          memberUids: ["host-1", "seeker-2"] as string[],
        },
      },
    );

    await waitFor(() => {
      expect(cancelThermometerWalk).toHaveBeenCalledTimes(1);
    });
    expect(cancelThermometerWalk).toHaveBeenCalledWith({
      sessionId: "session-1",
      pendingQuestionId: "pq-orphan",
      senderUid: "seeker-2",
      senderRole: "seeker",
      reason: "orphan",
    });

    rerender({
      pendingQuestions: [walkingQuestion()],
      memberUids: ["host-1", "seeker-2"],
    });

    await waitFor(() => {
      expect(cancelThermometerWalk).toHaveBeenCalledTimes(1);
    });
  });

  it("does not cancel when role is hider", async () => {
    renderHook(() =>
      useCancelOrphanThermometerWalks({
        sessionId: "session-1",
        myUid: "hider-1",
        myRole: "hider",
        memberUids: ["host-1", "hider-1"],
        pendingQuestions: [walkingQuestion()],
        cancelThermometerWalk,
      }),
    );

    await waitFor(() => {
      expect(cancelThermometerWalk).not.toHaveBeenCalled();
    });
  });

  it("does not cancel walks whose creator is still a member", async () => {
    renderHook(() =>
      useCancelOrphanThermometerWalks({
        sessionId: "session-1",
        myUid: "seeker-2",
        myRole: "seeker",
        memberUids: ["host-1", "seeker-2", "gone-1"],
        pendingQuestions: [walkingQuestion()],
        cancelThermometerWalk,
      }),
    );

    await waitFor(() => {
      expect(cancelThermometerWalk).not.toHaveBeenCalled();
    });
  });
});
