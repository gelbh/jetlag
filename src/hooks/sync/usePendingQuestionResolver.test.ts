import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import { usePendingQuestionResolver } from "./usePendingQuestionResolver";

const updatePendingQuestion = vi.fn();
const getPendingQuestionStatus = vi.fn();
const createAnnotation = vi.fn();

vi.mock("../../services/firestore/firestoreSessionExtras", () => ({
  updatePendingQuestion: (...args: unknown[]) => updatePendingQuestion(...args),
  getPendingQuestionStatus: (...args: unknown[]) =>
    getPendingQuestionStatus(...args),
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
  beforeEach(() => {
    updatePendingQuestion.mockReset();
    getPendingQuestionStatus.mockReset();
    createAnnotation.mockReset();
    getPendingQuestionStatus.mockResolvedValue("answered");
  });

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

  it("skips answered questions created before session reset", async () => {
    updatePendingQuestion.mockResolvedValue(undefined);
    createAnnotation.mockResolvedValue({ id: "ann-1" } as AnnotationRecord);

    renderHook(() =>
      usePendingQuestionResolver({
        sessionId: "session-1",
        enabled: true,
        pendingQuestions: [photoPending],
        createAnnotation,
        gameArea,
        sessionResetAt: "2026-01-02T00:00:00.000Z",
      }),
    );

    await waitFor(() => {
      expect(createAnnotation).not.toHaveBeenCalled();
    });

    expect(updatePendingQuestion).not.toHaveBeenCalled();
    expect(getPendingQuestionStatus).not.toHaveBeenCalled();
  });

  it("skips create when the pending question is no longer answered", async () => {
    getPendingQuestionStatus.mockResolvedValue("resolved");
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
      expect(getPendingQuestionStatus).toHaveBeenCalledWith(
        "session-1",
        "pq-photo",
      );
    });

    expect(createAnnotation).not.toHaveBeenCalled();
    expect(updatePendingQuestion).not.toHaveBeenCalled();
  });

  it("creates radar annotations with the pending question id", async () => {
    const radarPending: PendingQuestionRecord = {
      id: "pq-radar-1",
      sessionId: "session-1",
      toolType: "radar",
      createdByUid: "seeker-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "answered",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: { radiusKm: 1 },
      },
      replyOptions: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
      promptText: "Radar?",
      answer: "yes",
    };

    updatePendingQuestion.mockResolvedValue(undefined);
    createAnnotation.mockResolvedValue({
      id: "pq-radar-1",
    } as AnnotationRecord);

    renderHook(() =>
      usePendingQuestionResolver({
        sessionId: "session-1",
        enabled: true,
        pendingQuestions: [radarPending],
        createAnnotation,
        gameArea,
      }),
    );

    await waitFor(() => {
      expect(createAnnotation).toHaveBeenCalledTimes(1);
    });

    expect(createAnnotation.mock.calls[0]?.[0]).toMatchObject({
      id: "pq-radar-1",
      type: "radar",
    });
    expect(updatePendingQuestion).toHaveBeenCalledWith(
      "session-1",
      "pq-radar-1",
      { status: "resolved", resolvedAnnotationId: "pq-radar-1" },
    );
  });

  it("cancels pending when resolve throws and does not retry", async () => {
    // Soft-fail: answered forever + re-resolve thrash crashed EXYS seeker tabs.
    const radarPending: PendingQuestionRecord = {
      id: "pq-radar-fail",
      sessionId: "session-1",
      toolType: "radar",
      createdByUid: "seeker-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "answered",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: { radiusKm: 1 },
      },
      replyOptions: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
      promptText: "Radar?",
      answer: "yes",
    };

    updatePendingQuestion.mockResolvedValue(undefined);
    createAnnotation.mockRejectedValue(new Error("resolve boom"));

    const { rerender } = renderHook(
      ({ pendingQuestions }) =>
        usePendingQuestionResolver({
          sessionId: "session-1",
          enabled: true,
          pendingQuestions,
          createAnnotation,
          gameArea,
        }),
      { initialProps: { pendingQuestions: [radarPending] } },
    );

    await waitFor(() => {
      expect(updatePendingQuestion).toHaveBeenCalledWith(
        "session-1",
        "pq-radar-fail",
        { status: "cancelled" },
      );
    });

    expect(createAnnotation).toHaveBeenCalledTimes(1);

    rerender({ pendingQuestions: [{ ...radarPending }] });

    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });

    expect(createAnnotation).toHaveBeenCalledTimes(1);
    expect(
      updatePendingQuestion.mock.calls.filter(
        (call) => call[2]?.status === "cancelled",
      ),
    ).toHaveLength(1);
  });

  it("completes to resolved when annotation id already known", async () => {
    const radarPending: PendingQuestionRecord = {
      id: "pq-radar-known",
      sessionId: "session-1",
      toolType: "radar",
      createdByUid: "seeker-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "answered",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: { radiusKm: 1 },
      },
      replyOptions: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
      promptText: "Radar?",
      answer: "yes",
    };

    updatePendingQuestion.mockResolvedValue(undefined);

    renderHook(() =>
      usePendingQuestionResolver({
        sessionId: "session-1",
        enabled: true,
        pendingQuestions: [radarPending],
        createAnnotation,
        gameArea,
        knownAnnotationIds: new Set(["pq-radar-known"]),
      }),
    );

    await waitFor(() => {
      expect(updatePendingQuestion).toHaveBeenCalledWith(
        "session-1",
        "pq-radar-known",
        { status: "resolved", resolvedAnnotationId: "pq-radar-known" },
      );
    });

    expect(createAnnotation).not.toHaveBeenCalled();
  });

  it("completes to resolved when status update fails after annotation create", async () => {
    const radarPending: PendingQuestionRecord = {
      id: "pq-radar-postwrite",
      sessionId: "session-1",
      toolType: "radar",
      createdByUid: "seeker-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      status: "answered",
      placement: {
        geometryJson: JSON.stringify({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-0.15, 51.45] },
        }),
        metadata: { radiusKm: 1 },
      },
      replyOptions: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
      promptText: "Radar?",
      answer: "yes",
    };

    createAnnotation.mockResolvedValue({
      id: "pq-radar-postwrite",
    } as AnnotationRecord);
    updatePendingQuestion
      .mockRejectedValueOnce(new Error("status boom"))
      .mockResolvedValue(undefined);

    renderHook(() =>
      usePendingQuestionResolver({
        sessionId: "session-1",
        enabled: true,
        pendingQuestions: [radarPending],
        createAnnotation,
        gameArea,
      }),
    );

    await waitFor(() => {
      expect(updatePendingQuestion).toHaveBeenCalledWith(
        "session-1",
        "pq-radar-postwrite",
        { status: "resolved", resolvedAnnotationId: "pq-radar-postwrite" },
      );
    });

    expect(createAnnotation).toHaveBeenCalledTimes(1);
    expect(
      updatePendingQuestion.mock.calls.filter(
        (call) => call[2]?.status === "cancelled",
      ),
    ).toHaveLength(0);
    // First call: happy-path resolve (rejected); second: catch complete-to-resolved
    expect(updatePendingQuestion).toHaveBeenCalledTimes(2);
  });
});
