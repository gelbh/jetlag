import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UNAVAILABLE_NO_ANCHOR } from "../../domain/questions/hiderTruth/shared";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";
import { useHiderQuestionTruths } from "./useHiderQuestionTruths";

const question: PendingQuestionRecord = {
  id: "q1",
  sessionId: "s1",
  toolType: "radar",
  createdByUid: "seeker",
  createdAt: "2026-01-01T00:00:00.000Z",
  status: "pending",
  placement: { lat: 51.5, lng: -0.1 },
  replyOptions: [],
  promptText: "Within 1 km?",
} as unknown as PendingQuestionRecord;

const noZoneContext = { hiderUid: "hider", zoneCenter: null, session: null };

describe("useHiderQuestionTruths", () => {
  it("reports no modes and loading while the truth reference is not ready", () => {
    const { result } = renderHook(() =>
      useHiderQuestionTruths([question], noZoneContext, undefined, {
        truthReferenceReady: false,
      }),
    );

    expect(result.current.truthReferenceModes.size).toBe(0);
    expect(result.current.loading).toBe(true);
  });

  it("resolves noHidingZone once ready with no zone center", async () => {
    const { result } = renderHook(() =>
      useHiderQuestionTruths([question], noZoneContext, undefined, {
        truthReferenceReady: true,
      }),
    );

    expect(result.current.truthReferenceModes.get("q1")).toBe("noHidingZone");
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.questionTruths.size).toBe(0);
  });

  it("labels the missing anchor during end game without a frozen location", async () => {
    const endGameContext = {
      hiderUid: "hider",
      zoneCenter: null,
      session: { endGameStartedAt: "2026-01-01T00:00:00.000Z", endGameTruthAnchors: {} },
    };
    const { result } = renderHook(() =>
      useHiderQuestionTruths([question], endGameContext, undefined, {
        truthReferenceReady: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.questionTruths.get("q1")?.label).toBe(UNAVAILABLE_NO_ANCHOR);
  });
});
