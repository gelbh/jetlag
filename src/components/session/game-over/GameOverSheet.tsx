import { useCallback, useState } from "react";
import type { GameOutcome } from "../../../domain/game/foundHider";
import type { GameResultRecord } from "../../../domain/game/gameResult";
import type { PlayerRole } from "../../../domain/session/playerRole";
import { formatClockDurationFromMs } from "../../../domain/time/formatClockDuration";
import { AnimatedOverlay } from "../../ui/AnimatedOverlay";
import { MapReplayLayer } from "./MapReplayLayer";

interface GameOverSheetProps {
  open: boolean;
  gameResult: GameResultRecord;
  playerRole: PlayerRole;
  myUid?: string;
  sessionId: string;
  rematchPending?: boolean;
  onRematch: () => void | Promise<void>;
  onHome: () => void;
}

function outcomeHeadline(
  outcome: GameOutcome,
  playerWon: boolean | undefined,
): string {
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
      return "End game — hider escaped";
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

export function GameOverSheet({
  open,
  gameResult,
  playerRole,
  myUid,
  sessionId,
  rematchPending = false,
  onRematch,
  onHome,
}: GameOverSheetProps) {
  const [replayOpen, setReplayOpen] = useState(false);

  const myPlayer = myUid
    ? gameResult.players.find((player) => player.uid === myUid)
    : undefined;
  const playerWon = myPlayer?.won;
  const headline = outcomeHeadline(gameResult.outcome, playerWon);
  const heroMs =
    playerRole === "hider" ? gameResult.hidingPhaseMs || gameResult.durationMs : gameResult.seekTimeMs;

  const handleRematch = useCallback(() => {
    void onRematch();
  }, [onRematch]);

  const footer = (
    <div className="space-y-2 border-t border-border bg-surface-panel px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
      <button
        type="button"
        onClick={handleRematch}
        disabled={rematchPending}
        className="btn-primary min-h-11 w-full disabled:opacity-50"
      >
        {rematchPending ? "Starting rematch…" : "Switch roles & rematch"}
      </button>
      <button
        type="button"
        onClick={onHome}
        className="btn-secondary min-h-11 w-full"
      >
        Home
      </button>
    </div>
  );

  return (
    <>
      <AnimatedOverlay
        open={open && !replayOpen}
        onClose={() => {}}
        dismissible={false}
        ariaLabel="Game over"
        pinned={footer}
        maxHeightClassName="max-h-[min(85dvh,560px)]"
        sheetClassName="mx-auto max-w-lg"
      >
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
            <StatRow
              label="Total round"
              value={formatClockDurationFromMs(gameResult.durationMs)}
            />
            <StatRow
              label="Hiding phase"
              value={formatClockDurationFromMs(gameResult.hidingPhaseMs)}
            />
            <StatRow
              label="Seek phase"
              value={formatClockDurationFromMs(gameResult.seekPhaseMs)}
            />
          </div>

          <button
            type="button"
            onClick={() => setReplayOpen(true)}
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
              <span className="block text-sm font-semibold text-ink">
                Map replay
              </span>
              <span className="block text-xs text-ink-muted">
                Full scrubber coming soon
              </span>
            </span>
          </button>
        </div>
      </AnimatedOverlay>

      <MapReplayLayer
        open={replayOpen}
        sessionId={sessionId}
        onClose={() => setReplayOpen(false)}
      />
    </>
  );
}
