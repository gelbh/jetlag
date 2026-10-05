import { Button } from "@mantine/core";
import { type ReactNode, useCallback, useState } from "react";
import type { GameOutcome } from "@/domain/game/foundHider";
import type { GameResultRecord } from "@/domain/game/gameResult";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import { formatClockDurationFromMs } from "@/domain/time/formatClockDuration";
import { SheetHost } from "../../ui/sheets/SheetHost";
import { MapReplayLayer } from "./MapReplayLayer";

interface GameOverSheetProps {
  open: boolean;
  gameResult: GameResultRecord | null;
  playerRole: PlayerRole;
  myUid?: string;
  sessionId: string;
  rematchPending?: boolean;
  rematchError?: string | null;
  onRematch: () => void | Promise<void>;
  onHome: () => void;
}

function outcomeHeadline(outcome: GameOutcome, playerWon: boolean | undefined): string {
  if (outcome === "found") {
    if (playerWon === true) {
      return "You found the hider";
    }
    if (playerWon === false) {
      return "You were found";
    }
    return "Hider found";
  }

  if (outcome === "ended_early") {
    if (playerWon === true) {
      return "Hider wins end game";
    }
    if (playerWon === false) {
      return "End game: hider escaped";
    }
    return "Round ended early";
  }

  return "Round over";
}

function formatOutcomeLabel(outcome: GameOutcome): string {
  switch (outcome) {
    case "found":
      return "Found";
    case "ended_early":
      return "End game";
    case "abandoned":
      return "Abandoned";
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2.5 last:border-b-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="font-mono text-sm tabular-nums text-ink">{value}</span>
    </div>
  );
}

interface GameOverResultBodyProps {
  gameResult: GameResultRecord;
  playerRole: PlayerRole;
  myUid?: string;
  onOpenReplay: () => void;
}

function GameOverResultBody({
  gameResult,
  playerRole,
  myUid,
  onOpenReplay,
}: GameOverResultBodyProps) {
  const myPlayer = myUid ? gameResult.players.find((player) => player.uid === myUid) : undefined;
  const playerWon = myPlayer?.won;
  const headline = outcomeHeadline(gameResult.outcome, playerWon);
  const hidingPhaseMs = gameResult.hidingPhaseMs ?? 0;
  const seekPhaseMs = gameResult.seekPhaseMs ?? 0;
  const heroMs = playerRole === "hider" ? hidingPhaseMs : gameResult.seekTimeMs;

  return (
    <div className="space-y-4 px-4 pb-4 pt-2">
      <div className="space-y-1 text-center">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-status-success">
          {formatOutcomeLabel(gameResult.outcome)}
        </p>
        <h2 className="text-lg font-semibold text-ink">{headline}</h2>
        <p className="font-mono text-3xl font-bold tabular-nums text-ink">
          {formatClockDurationFromMs(heroMs)}
        </p>
        <p className="text-xs text-ink-muted">
          {playerRole === "hider" ? "Hiding time" : "Seek time"}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface-deep px-3">
        <StatRow label="Total round" value={formatClockDurationFromMs(gameResult.durationMs)} />
        <StatRow label="Hiding phase" value={formatClockDurationFromMs(hidingPhaseMs)} />
        <StatRow label="Seek phase" value={formatClockDurationFromMs(seekPhaseMs)} />
      </div>

      <button
        type="button"
        onClick={onOpenReplay}
        className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface-deep p-3 text-left"
        aria-label="Open map replay"
      >
        <span
          className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-surface-panel text-xs text-ink-muted"
          aria-hidden="true"
        >
          Map
        </span>
        <span className="space-y-0.5">
          <span className="block text-sm font-semibold text-ink">Map replay</span>
          <span className="block text-xs text-ink-muted">Full scrubber coming soon</span>
        </span>
      </button>
    </div>
  );
}

interface GameOverFooterProps {
  rematchPending: boolean;
  rematchError: string | null;
  onRematch: () => void | Promise<void>;
  onHome: () => void;
}

function GameOverFooter({ rematchPending, rematchError, onRematch, onHome }: GameOverFooterProps) {
  const handleRematch = useCallback(() => {
    void Promise.resolve(onRematch()).catch(() => {
      // Parent surfaces rematchError; swallow to avoid unhandled rejection.
    });
  }, [onRematch]);

  return (
    <div className="space-y-2 border-t border-border bg-surface-panel px-4 pb-[max(1rem,var(--safe-area-bottom))] pt-3">
      {rematchError ? (
        <p className="text-center text-sm text-status-error" role="alert">
          {rematchError}
        </p>
      ) : null}
      <Button
        fullWidth
        variant="filled"
        onClick={handleRematch}
        disabled={rematchPending}
        className="min-h-11"
      >
        {rematchPending ? "Starting rematch…" : "Switch roles & rematch"}
      </Button>
      <Button fullWidth variant="default" onClick={onHome} className="min-h-11">
        Home
      </Button>
    </div>
  );
}

export function GameOverSheet({
  open,
  gameResult,
  playerRole,
  myUid,
  sessionId,
  rematchPending = false,
  rematchError = null,
  onRematch,
  onHome,
}: GameOverSheetProps) {
  // Result/open identity: reset replay without an effect so the always-mounted
  // SheetHost can still exit-animate (keying the whole sheet would remount it).
  const resultSessionKey =
    open && gameResult != null
      ? `${gameResult.sessionId}:${gameResult.roundNumber}:${gameResult.endedAt}`
      : null;
  const [replayOpen, setReplayOpen] = useState(false);
  const [seenResultSessionKey, setSeenResultSessionKey] = useState(resultSessionKey);
  if (seenResultSessionKey !== resultSessionKey) {
    setSeenResultSessionKey(resultSessionKey);
    setReplayOpen(false);
  }

  const pinned: ReactNode =
    gameResult != null ? (
      <GameOverFooter
        rematchPending={rematchPending}
        rematchError={rematchError}
        onRematch={onRematch}
        onHome={onHome}
      />
    ) : null;

  return (
    <>
      <SheetHost
        open={open && gameResult != null && !replayOpen}
        onClose={() => {}}
        dismissible={false}
        ariaLabel="Game over"
        pinned={pinned}
        maxHeightClassName="max-h-[min(85dvh,560px)]"
        sheetClassName="mx-auto max-w-lg"
      >
        {gameResult != null && open ? (
          <GameOverResultBody
            gameResult={gameResult}
            playerRole={playerRole}
            myUid={myUid}
            onOpenReplay={() => setReplayOpen(true)}
          />
        ) : null}
      </SheetHost>

      <MapReplayLayer
        open={replayOpen && gameResult != null}
        sessionId={sessionId}
        onClose={() => setReplayOpen(false)}
      />
    </>
  );
}
