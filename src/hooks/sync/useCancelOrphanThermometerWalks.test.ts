import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { THERMOMETER_WALK_MAX_DURATION_MS } from "../../domain/questions";
import { STALE_WALK_CLOCK_MS } from "./useStaleWalkNowMs";
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


function seekerLocation(
  overrides: Partial<{ uid: string; updatedAt: string }> & { uid: string; updatedAt: string },
) {
  return {
    uid: overrides.uid,
    sessionId: "session-1",
    lat: 0,
    lng: 0,
    updatedAt: overrides.updatedAt,
    role: "seeker" as const,
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
          seekerLocations: [],
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
        seekerLocations: [],
        cancelThermometerWalk,
      }),
    );

    await waitFor(() => {
      expect(cancelThermometerWalk).not.toHaveBeenCalled();
    });
  });

  it("does not cancel walks whose creator is still a member", async () => {
    const createdAt = new Date().toISOString();
    renderHook(() =>
      useCancelOrphanThermometerWalks({
        sessionId: "session-1",
        myUid: "seeker-2",
        myRole: "seeker",
        memberUids: ["host-1", "seeker-2", "gone-1"],
        pendingQuestions: [walkingQuestion({ createdByUid: "gone-1", createdAt })],
        seekerLocations: [],
        cancelThermometerWalk,
      }),
    );

    await waitFor(() => {
      expect(cancelThermometerWalk).not.toHaveBeenCalled();
    });
  });

  it("cancels stale walks once when creator is still a member", async () => {
    const createdAt = "2026-01-01T00:00:00.000Z";
    const nowMs = Date.parse(createdAt) + THERMOMETER_WALK_MAX_DURATION_MS + 1;
    const staleWalk = walkingQuestion({
      id: "pq-stale",
      createdByUid: "seeker-1",
      createdAt,
    });

    const { rerender } = renderHook(
      ({ pendingQuestions }) =>
        useCancelOrphanThermometerWalks({
          sessionId: "session-1",
          myUid: "seeker-2",
          myRole: "seeker",
          memberUids: ["host-1", "seeker-1", "seeker-2"],
          pendingQuestions,
          seekerLocations: [
            seekerLocation({ uid: "seeker-1", updatedAt: "2026-01-01T00:00:00.000Z" }),
          ],
          cancelThermometerWalk,
          nowMs: () => nowMs,
        }),
      {
        initialProps: {
          pendingQuestions: [staleWalk] as PendingQuestionRecord[],
        },
      },
    );

    await waitFor(() => {
      expect(cancelThermometerWalk).toHaveBeenCalledTimes(1);
    });
    expect(cancelThermometerWalk).toHaveBeenCalledWith({
      sessionId: "session-1",
      pendingQuestionId: "pq-stale",
      senderUid: "seeker-2",
      senderRole: "seeker",
      reason: "stale",
    });

    rerender({ pendingQuestions: [staleWalk] });

    await waitFor(() => {
      expect(cancelThermometerWalk).toHaveBeenCalledTimes(1);
    });
  });

  it("does not cancel walks younger than max duration", async () => {
    const createdAt = "2026-01-01T00:00:00.000Z";
    const nowMs = Date.parse(createdAt) + THERMOMETER_WALK_MAX_DURATION_MS - 1;

    renderHook(() =>
      useCancelOrphanThermometerWalks({
        sessionId: "session-1",
        myUid: "seeker-2",
        myRole: "seeker",
        memberUids: ["host-1", "seeker-1", "seeker-2"],
        pendingQuestions: [
          walkingQuestion({
            id: "pq-fresh",
            createdByUid: "seeker-1",
            createdAt,
          }),
        ],
        seekerLocations: [],
        cancelThermometerWalk,
        nowMs: () => nowMs,
      }),
    );

    await waitFor(() => {
      expect(cancelThermometerWalk).not.toHaveBeenCalled();
    });
  });

  it("prefers orphan reason when walk is both orphan and stale", async () => {
    const createdAt = "2026-01-01T00:00:00.000Z";
    const nowMs = Date.parse(createdAt) + THERMOMETER_WALK_MAX_DURATION_MS + 1;

    renderHook(() =>
      useCancelOrphanThermometerWalks({
        sessionId: "session-1",
        myUid: "seeker-2",
        myRole: "seeker",
        memberUids: ["host-1", "seeker-2"],
        pendingQuestions: [
          walkingQuestion({
            id: "pq-both",
            createdByUid: "gone-1",
            createdAt,
          }),
        ],
        seekerLocations: [],
        cancelThermometerWalk,
        nowMs: () => nowMs,
      }),
    );

    await waitFor(() => {
      expect(cancelThermometerWalk).toHaveBeenCalledTimes(1);
    });
    expect(cancelThermometerWalk).toHaveBeenCalledWith(
      expect.objectContaining({
        pendingQuestionId: "pq-both",
        reason: "orphan",
      }),
    );
  });

  it("retries after a failed cancellation attempt", async () => {
    cancelThermometerWalk.mockRejectedValueOnce(new Error("permission-denied"));

    const { rerender } = renderHook(
      ({ pendingQuestions }) =>
        useCancelOrphanThermometerWalks({
          sessionId: "session-1",
          myUid: "seeker-2",
          myRole: "seeker",
          memberUids: ["host-1", "seeker-2"],
          pendingQuestions,
          seekerLocations: [],
          cancelThermometerWalk,
        }),
      { initialProps: { pendingQuestions: [walkingQuestion()] } },
    );

    await waitFor(() => {
      expect(cancelThermometerWalk).toHaveBeenCalledTimes(1);
    });

    rerender({ pendingQuestions: [walkingQuestion()] });

    await waitFor(() => {
      expect(cancelThermometerWalk).toHaveBeenCalledTimes(2);
    });
  });

  it("retries after a failed stale cancellation attempt", async () => {
    cancelThermometerWalk.mockRejectedValueOnce(new Error("unavailable"));
    const createdAt = "2026-01-01T00:00:00.000Z";
    const nowMs = Date.parse(createdAt) + THERMOMETER_WALK_MAX_DURATION_MS + 1;
    const staleWalk = walkingQuestion({
      id: "pq-stale-retry",
      createdByUid: "seeker-1",
      createdAt,
    });

    const { rerender } = renderHook(
      ({ pendingQuestions }) =>
        useCancelOrphanThermometerWalks({
          sessionId: "session-1",
          myUid: "seeker-2",
          myRole: "seeker",
          memberUids: ["host-1", "seeker-1", "seeker-2"],
          pendingQuestions,
          seekerLocations: [],
          cancelThermometerWalk,
          nowMs: () => nowMs,
        }),
      { initialProps: { pendingQuestions: [staleWalk] } },
    );

    await waitFor(() => {
      expect(cancelThermometerWalk).toHaveBeenCalledTimes(1);
    });

    rerender({ pendingQuestions: [staleWalk] });

    await waitFor(() => {
      expect(cancelThermometerWalk).toHaveBeenCalledTimes(2);
    });
    expect(cancelThermometerWalk).toHaveBeenLastCalledWith(
      expect.objectContaining({ reason: "stale" }),
    );
  });

  it("cancels stale walks when the shared clock ticks past max duration", async () => {
    vi.useFakeTimers();
    try {
      const createdAt = new Date().toISOString();

      renderHook(() =>
        useCancelOrphanThermometerWalks({
          sessionId: "session-1",
          myUid: "seeker-2",
          myRole: "seeker",
          memberUids: ["host-1", "seeker-1", "seeker-2"],
          pendingQuestions: [
            walkingQuestion({
              id: "pq-clock-stale",
              createdByUid: "seeker-1",
              createdAt,
            }),
          ],
          seekerLocations: [
            seekerLocation({ uid: "seeker-1", updatedAt: createdAt }),
          ],
          cancelThermometerWalk,
        }),
      );

      expect(cancelThermometerWalk).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(
          THERMOMETER_WALK_MAX_DURATION_MS + STALE_WALK_CLOCK_MS,
        );
      });

      expect(cancelThermometerWalk).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingQuestionId: "pq-clock-stale",
          reason: "stale",
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
