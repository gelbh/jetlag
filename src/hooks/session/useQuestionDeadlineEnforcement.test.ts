import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import { useQuestionDeadlineEnforcement } from "./useQuestionDeadlineEnforcement";

vi.mock("../../services/firestore/firestoreSessionExtras", () => ({
  updatePendingQuestion: vi.fn(async () => undefined),
}));

import { updatePendingQuestion } from "../../services/firestore/firestoreSessionExtras";

function pendingQuestion(
  overrides: Partial<PendingQuestionRecord> = {},
): PendingQuestionRecord {
  return {
    id: "pq-1",
    sessionId: "session-1",
    toolType: "radar",
    createdByUid: "seeker",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "pending",
    placement: { geometryJson: "{}", metadata: {} },
    replyOptions: [],
    promptText: "Are you within range?",
    answerableAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

describe("useQuestionDeadlineEnforcement", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks expired questions, posts a system message, and pauses the timer", async () => {
    const pauseTimer = vi.fn();
    const postSystemMessage = vi.fn(async () => undefined);

    renderHook(() =>
      useQuestionDeadlineEnforcement({
        sessionId: "session-1",
        enabled: true,
        sessionRules: { gameSize: "small" },
        pendingQuestions: [pendingQuestion()],
        hidingZones: [],
        timerRunning: true,
        pauseTimer,
        resumeTimer: vi.fn(),
        postSystemMessage,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(updatePendingQuestion).toHaveBeenCalledWith(
      "session-1",
      "pq-1",
      expect.objectContaining({
        deadlineExpiredAt: expect.any(String),
      }),
    );
    expect(postSystemMessage).toHaveBeenCalledWith(
      expect.stringMatching(/Answer deadline passed/i),
    );
    expect(pauseTimer).toHaveBeenCalledTimes(1);
  });

  it("does not run when disabled or session id is missing", async () => {
    renderHook(() =>
      useQuestionDeadlineEnforcement({
        sessionId: undefined,
        enabled: true,
        sessionRules: { gameSize: "small" },
        pendingQuestions: [pendingQuestion()],
        hidingZones: [],
        timerRunning: true,
        pauseTimer: vi.fn(),
        resumeTimer: vi.fn(),
        postSystemMessage: vi.fn(async () => undefined),
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(updatePendingQuestion).not.toHaveBeenCalled();
  });

  it("resumes the timer after a late answer when move is not in progress", async () => {
    const pauseTimer = vi.fn();
    const resumeTimer = vi.fn();
    const expiredAt = new Date().toISOString();

    const { rerender } = renderHook(
      ({ pendingQuestions, timerRunning }) =>
        useQuestionDeadlineEnforcement({
          sessionId: "session-1",
          enabled: true,
          sessionRules: { gameSize: "small" },
          pendingQuestions,
          hidingZones: [],
          timerRunning,
          pauseTimer,
          resumeTimer,
          postSystemMessage: vi.fn(async () => undefined),
        }),
      {
        initialProps: {
          pendingQuestions: [pendingQuestion()],
          timerRunning: true,
        },
      },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(pauseTimer).toHaveBeenCalledTimes(1);

    rerender({
      pendingQuestions: [
        pendingQuestion({
          status: "answered",
          deadlineExpiredAt: expiredAt,
          answeredLate: true,
        }),
      ],
      timerRunning: false,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(resumeTimer).toHaveBeenCalledTimes(1);
  });

  it("skips resume while a hiding-zone move is in progress", async () => {
    const resumeTimer = vi.fn();
    const expiredAt = new Date().toISOString();

    const { rerender } = renderHook(
      ({ pendingQuestions, timerRunning }) =>
        useQuestionDeadlineEnforcement({
          sessionId: "session-1",
          enabled: true,
          sessionRules: { gameSize: "small" },
          pendingQuestions,
          hidingZones: [
            {
              hiderUid: "hider-1",
              sessionId: "session-1",
              stationId: "station-1",
              stationName: "Central",
              center: { lat: 53.35, lng: -6.26 },
              radiusMeters: 400,
              geometryJson: "{}",
              status: "confirmed",
              confirmedAt: "2026-01-01T00:00:00.000Z",
              moveInProgress: true,
            },
          ],
          timerRunning,
          pauseTimer: vi.fn(),
          resumeTimer,
          postSystemMessage: vi.fn(async () => undefined),
        }),
      {
        initialProps: {
          pendingQuestions: [pendingQuestion()],
          timerRunning: true,
        },
      },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    rerender({
      pendingQuestions: [
        pendingQuestion({
          status: "answered",
          deadlineExpiredAt: expiredAt,
          answeredLate: true,
        }),
      ],
      timerRunning: false,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(resumeTimer).not.toHaveBeenCalled();
  });
});
