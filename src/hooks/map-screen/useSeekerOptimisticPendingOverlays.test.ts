import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import { useSeekerOptimisticPendingOverlays } from "./useSeekerOptimisticPendingOverlays";

function optimisticEntry(id: string): PendingQuestionRecord {
  return {
    id,
    sessionId: "session-1",
    toolType: "radar",
    createdByUid: "seeker",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "pending",
    placement: {
      geometryJson: "{}",
      metadata: {},
    },
    replyOptions: [],
    promptText: "Test",
  };
}

describe("useSeekerOptimisticPendingOverlays", () => {
  it("does not retain an entry when remote state arrives before registration", () => {
    const entry = optimisticEntry("pq-remote-first");
    const { result, rerender } = renderHook(
      ({ pendingQuestions }: { pendingQuestions: PendingQuestionRecord[] }) =>
        useSeekerOptimisticPendingOverlays(pendingQuestions),
      { initialProps: { pendingQuestions: [entry] } },
    );

    act(() => {
      result.current.registerOptimisticPending(entry);
    });

    rerender({ pendingQuestions: [] });

    expect(result.current.displayPendingQuestions).toHaveLength(0);
  });

  it("keeps unsynced optimistic questions until remote pending arrives", () => {
    const { result, rerender } = renderHook(
      ({ pendingQuestions }: { pendingQuestions: PendingQuestionRecord[] }) =>
        useSeekerOptimisticPendingOverlays(pendingQuestions),
      { initialProps: { pendingQuestions: [] as PendingQuestionRecord[] } },
    );

    act(() => {
      result.current.registerOptimisticPending(optimisticEntry("pq-local"));
    });

    expect(result.current.displayPendingQuestions).toHaveLength(1);
    expect(result.current.displayPendingQuestions[0]?.id).toBe("pq-local");

    rerender({ pendingQuestions: [optimisticEntry("pq-local")] });

    expect(result.current.displayPendingQuestions).toHaveLength(1);
    expect(result.current.displayPendingQuestions[0]?.id).toBe("pq-local");

    rerender({ pendingQuestions: [] });

    expect(result.current.displayPendingQuestions).toHaveLength(0);
  });
});
