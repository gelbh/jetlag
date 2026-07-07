import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveActivitySync } from "./useLiveActivitySync";
import type { PendingQuestionRecord } from "../domain/sessionChat";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../domain/notifications";

const { showOngoingNotification, dismissOngoingNotification } = vi.hoisted(
  () => ({
    showOngoingNotification: vi.fn(),
    dismissOngoingNotification: vi.fn(),
  }),
);

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => "android"),
  },
}));

vi.mock("../services/notifications", () => ({
  JetlagLiveActivity: {
    startQuestionActivity: vi.fn(),
    updateQuestionActivity: vi.fn(),
    endQuestionActivity: vi.fn(),
    startSessionTimerActivity: vi.fn(),
    updateSessionTimerActivity: vi.fn(),
    endSessionTimerActivity: vi.fn(),
    showOngoingNotification,
    dismissOngoingNotification,
  },
}));

describe("useLiveActivitySync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an ongoing Android notification for an active question", async () => {
    const pendingQuestions: PendingQuestionRecord[] = [
      {
        id: "q1",
        sessionId: "session-1",
        toolType: "radar",
        createdByUid: "seeker",
        createdAt: new Date().toISOString(),
        status: "pending",
        answerableAt: new Date().toISOString(),
        placement: { geometryJson: "{}", metadata: {} },
        replyOptions: [],
        promptText: "Radar?",
      },
    ];

    renderHook(() =>
      useLiveActivitySync({
        enabled: true,
        sessionId: "session-1",
        sessionRules: { gameSize: "medium" },
        timerState: { accumulatedMs: 0, runningSince: null },
        timerHasStarted: false,
        pendingQuestions,
        preferences: {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          enabled: true,
          liveActivities: true,
        },
      }),
    );

    await waitFor(() => {
      expect(showOngoingNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1001,
          title: "Question active",
          ongoing: true,
        }),
      );
    });
  });
});

describe("selectPrimaryQuestionTimer", () => {
  it("prioritizes walking questions", async () => {
    const { selectPrimaryQuestionTimer } = await import(
      "../domain/questionTimerDisplay"
    );
    const pendingQuestions: PendingQuestionRecord[] = [
      {
        id: "q1",
        sessionId: "s1",
        toolType: "radar",
        createdByUid: "seeker",
        createdAt: "2026-01-01T00:00:00.000Z",
        status: "walking",
        placement: { geometryJson: "{}", metadata: {} },
        replyOptions: [],
        promptText: "Walk",
      },
    ];

    const timer = selectPrimaryQuestionTimer(pendingQuestions, {
      gameSize: "medium",
    });
    expect(timer?.countdownLabel).toBe("WALKING");
  });
});
