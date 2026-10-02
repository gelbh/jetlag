import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "../../domain/map/annotations";
import type { HiderTruthResult } from "../../domain/questions/hiderTruth";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import { useHiderPendingPreviewEliminations } from "./useHiderPendingPreviewEliminations";

const buildPendingPreviewEliminationFeatures = vi.hoisted(() => vi.fn());

vi.mock("../../domain/questions/overlays/pendingPreviewElimination", async () => {
  const actual = await vi.importActual<
    typeof import("../../domain/questions/overlays/pendingPreviewElimination")
  >("../../domain/questions/overlays/pendingPreviewElimination");
  return {
    ...actual,
    buildPendingPreviewEliminationFeatures: (...args: unknown[]) =>
      buildPendingPreviewEliminationFeatures(...args),
  };
});

const gameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.2, 51.4],
      [-0.1, 51.4],
      [-0.1, 51.5],
      [-0.2, 51.5],
      [-0.2, 51.4],
    ],
  ],
};

function pendingQuestion(): PendingQuestionRecord {
  return {
    id: "pq-1",
    sessionId: "session-1",
    toolType: "radar",
    createdByUid: "seeker-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "pending",
    placement: {
      geometryJson: JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [-0.15, 51.45] },
      }),
      metadata: { radiusMeters: 1609 },
    },
    replyOptions: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
    promptText: "Radar?",
  };
}

function pendingQuestionWithGeometry(
  coordinates: [number, number],
): PendingQuestionRecord {
  return {
    ...pendingQuestion(),
    placement: {
      geometryJson: JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates },
      }),
      metadata: { radiusMeters: 1609 },
    },
  };
}

describe("useHiderPendingPreviewEliminations", () => {
  beforeEach(() => {
    buildPendingPreviewEliminationFeatures.mockReset();
    buildPendingPreviewEliminationFeatures.mockReturnValue(new Promise(() => {}));
  });

  it("does not rebuild when questionTruths Map identity changes but replies match", async () => {
    const truthsA = new Map<string, HiderTruthResult>([
      ["pq-1", { replyId: "no", label: "No" }],
    ]);

    const { rerender } = renderHook(
      ({ truths }) =>
        useHiderPendingPreviewEliminations({
          pendingQuestions: [pendingQuestion()],
          questionTruths: truths,
          optimisticAnswers: new Map<string, string>(),
          annotations: [],
          gameArea,
        }),
      { initialProps: { truths: truthsA } },
    );

    await waitFor(() => {
      expect(buildPendingPreviewEliminationFeatures).toHaveBeenCalledTimes(1);
    });

    const truthsB = new Map<string, HiderTruthResult>([
      ["pq-1", { replyId: "no", label: "No" }],
    ]);

    rerender({ truths: truthsB });

    expect(buildPendingPreviewEliminationFeatures).toHaveBeenCalledTimes(1);
  });

  it("rebuilds when pending placement geometry changes with the same ids", async () => {
    const truths = new Map<string, HiderTruthResult>([
      ["pq-1", { replyId: "no", label: "No" }],
    ]);

    const { rerender } = renderHook(
      ({ pendingQuestions }) =>
        useHiderPendingPreviewEliminations({
          pendingQuestions,
          questionTruths: truths,
          optimisticAnswers: new Map<string, string>(),
          annotations: [],
          gameArea,
        }),
      {
        initialProps: {
          pendingQuestions: [pendingQuestionWithGeometry([-0.15, 51.45])],
        },
      },
    );

    await waitFor(() => {
      expect(buildPendingPreviewEliminationFeatures).toHaveBeenCalledTimes(1);
    });

    rerender({
      pendingQuestions: [pendingQuestionWithGeometry([-0.14, 51.46])],
    });

    await waitFor(() => {
      expect(buildPendingPreviewEliminationFeatures).toHaveBeenCalledTimes(2);
    });
  });
});
