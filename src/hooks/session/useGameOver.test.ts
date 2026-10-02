import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameResultRecord } from "../../domain/game/gameResult";
import { createTestRemoteSession, createTestSession } from "../../test/fixtures/sessions";
import { useGameOver } from "./useGameOver";

const isFirebaseConfigured = vi.hoisted(() => vi.fn(() => true));
const subscribeToGameResult = vi.hoisted(() => vi.fn());

vi.mock("../../services/core/firebase/firebase", () => ({
  isFirebaseConfigured,
}));

vi.mock("../../services/firestore/firestoreGameResult", () => ({
  subscribeToGameResult,
}));

const remoteResult: GameResultRecord = {
  sessionId: "remote-session-1",
  roundNumber: 1,
  gameSize: "medium",
  outcome: "found",
  endedAt: "2026-01-01T01:00:00.000Z",
  durationMs: 60_000,
  seekTimeMs: 60_000,
  players: [],
};

describe("useGameOver", () => {
  beforeEach(() => {
    isFirebaseConfigured.mockReturnValue(true);
    subscribeToGameResult.mockReset();
    subscribeToGameResult.mockImplementation((_sessionId, _resultId, onChange) => {
      onChange(remoteResult);
      return vi.fn();
    });
  });

  it("drops stale remoteResult when round is no longer complete", () => {
    const completeSession = createTestRemoteSession({
      foundConfirmedAt: "2026-01-01T01:00:00.000Z",
      gameOutcome: "found",
      gameResultId: "result-1",
    });

    const { result, rerender } = renderHook(({ session }) => useGameOver(session), {
      initialProps: { session: completeSession },
    });

    expect(result.current.result).toEqual(remoteResult);

    act(() => {
      rerender({
        session: createTestRemoteSession({
          foundConfirmedAt: undefined,
          gameOutcome: undefined,
          gameResultId: "result-1",
        }),
      });
    });

    expect(result.current.result).toBeNull();

    // Re-open round-complete without a fresh snapshot: cleared remoteResult
    // must not resurrect the previous game-over object.
    subscribeToGameResult.mockImplementation(() => vi.fn());
    act(() => {
      rerender({
        session: createTestRemoteSession({
          foundConfirmedAt: "2026-01-01T02:00:00.000Z",
          gameOutcome: "found",
          gameResultId: "result-1",
        }),
      });
    });

    expect(result.current.result).toBeNull();
  });

  it("splits hide and seek phases for local offline results", () => {
    isFirebaseConfigured.mockReturnValue(false);
    const { result } = renderHook(() =>
      useGameOver(
        createTestSession({
          foundConfirmedAt: "2026-01-01T01:05:00.000Z",
          gameOutcome: "found",
          gameSize: "medium",
          timerAccumulatedMs: 3_900_000,
        }),
      ),
    );

    expect(result.current.result).toMatchObject({
      durationMs: 3_900_000,
      hidingPhaseMs: 3_600_000,
      seekPhaseMs: 300_000,
      seekTimeMs: 300_000,
    });
  });
});
