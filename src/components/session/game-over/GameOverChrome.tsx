import type { GameResultRecord } from "../../../domain/game/gameResult";
import type { PlayerRole } from "../../../domain/session/playerRole";
import { GameOverSheet } from "./GameOverSheet";

interface GameOverChromeProps {
  sessionId: string;
  playerRole: PlayerRole;
  myUid?: string;
  actions: {
    gameOver: {
      result: GameResultRecord | null;
      loading: boolean;
      roundComplete: boolean;
    };
    rematchPending: boolean;
    rematchError: string | null;
    handleRematch: () => Promise<void>;
    handleGameOverHome: () => void;
  };
}

export function GameOverChrome({
  sessionId,
  playerRole,
  myUid,
  actions,
}: GameOverChromeProps) {
  const { gameOver, rematchPending, rematchError, handleRematch, handleGameOverHome } =
    actions;

  if (gameOver.loading) {
    return (
      <div
        className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-surface-deep/80 px-6"
        role="status"
        aria-live="polite"
        aria-label="Loading game results"
      >
        <p className="text-sm text-ink-muted">Loading results…</p>
      </div>
    );
  }

  if (!gameOver.result) {
    return null;
  }

  return (
    <GameOverSheet
      open
      gameResult={gameOver.result}
      playerRole={playerRole}
      myUid={myUid}
      sessionId={sessionId}
      rematchPending={rematchPending}
      rematchError={rematchError}
      onRematch={handleRematch}
      onHome={handleGameOverHome}
    />
  );
}
