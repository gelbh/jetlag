import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GameResultRecord } from "@/domain/game/gameResult";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { GameOverSheet } from "./GameOverSheet";

const resultA: GameResultRecord = {
  sessionId: "session-1",
  roundNumber: 1,
  gameSize: "medium",
  outcome: "found",
  endedAt: "2026-01-01T01:00:00.000Z",
  durationMs: 60_000,
  hidingPhaseMs: 10_000,
  seekPhaseMs: 50_000,
  seekTimeMs: 50_000,
  players: [
    { uid: "u1", role: "seeker", distanceMeters: 0, maxDistanceFromStartMeters: 0, won: true },
  ],
};

const resultB: GameResultRecord = {
  ...resultA,
  roundNumber: 2,
  endedAt: "2026-01-01T02:00:00.000Z",
};

describe("GameOverSheet", () => {
  it("resets replay when result clears without unmounting (local rematch path)", async () => {
    const { rerender } = renderWithAppUi(
      <GameOverSheet
        open
        gameResult={resultA}
        playerRole="seeker"
        myUid="u1"
        sessionId="session-1"
        onRematch={vi.fn()}
        onHome={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Game over" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open map replay" }));
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Map replay" })).toBeInTheDocument();
    });

    // Rematch clears result without loading interstitial unmount.
    rerender(
      <GameOverSheet
        open={false}
        gameResult={null}
        playerRole="seeker"
        myUid="u1"
        sessionId="session-1"
        onRematch={vi.fn()}
        onHome={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Map replay" })).not.toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: "Game over" })).not.toBeInTheDocument();
    });

    rerender(
      <GameOverSheet
        open
        gameResult={resultB}
        playerRole="seeker"
        myUid="u1"
        sessionId="session-1"
        onRematch={vi.fn()}
        onHome={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Game over" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("dialog", { name: "Map replay" })).not.toBeInTheDocument();
  });
});
