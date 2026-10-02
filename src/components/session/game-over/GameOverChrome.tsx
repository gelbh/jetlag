import { Center, Loader, Stack, Text } from "@mantine/core";
import type { GameResultRecord } from "@/domain/game/gameResult";
import type { PlayerRole } from "@/domain/session/players/playerRole";
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

export function GameOverChrome({ sessionId, playerRole, myUid, actions }: GameOverChromeProps) {
  const { gameOver, rematchPending, rematchError, handleRematch, handleGameOverHome } = actions;

  if (gameOver.loading) {
    return (
      <div
        className="fixed inset-0 z-[var(--z-modal)] bg-surface-deep/80 px-6"
        role="status"
        aria-live="polite"
        aria-label="Loading game results"
      >
        <Center h="100%">
          <Stack align="center" gap="sm">
            <Loader />
            <Text size="sm" c="dimmed">
              Loading results…
            </Text>
          </Stack>
        </Center>
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
