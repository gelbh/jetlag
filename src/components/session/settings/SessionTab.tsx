import { useState } from "react";
import { ShareCode } from "../ShareCode";

export interface MapSettingsSessionTabProps {
  sessionCode: string;
  remoteSession: boolean;
  onClearMap?: () => void;
  onExport?: () => void;
  isHost: boolean;
  onResetBoard?: () => void;
  onResetSession?: () => void;
  onEndSession?: () => void;
  onLeaveSession?: () => void;
  endGameBlocked?: boolean;
  expansionPackEnabled?: boolean;
  onOpenCurseReference?: () => void;
}

export function MapSettingsSessionTab({
  sessionCode,
  remoteSession,
  onClearMap,
  onExport,
  isHost,
  onResetBoard,
  onResetSession,
  onEndSession,
  onLeaveSession,
  endGameBlocked = false,
  expansionPackEnabled = false,
  onOpenCurseReference,
}: MapSettingsSessionTabProps) {
  const [resetMenuOpen, setResetMenuOpen] = useState(false);

  return (
    <div className="space-y-4">
      <ShareCode code={sessionCode} remote={remoteSession} />

      {expansionPackEnabled && onOpenCurseReference ? (
        <button
          type="button"
          onClick={onOpenCurseReference}
          className="btn-secondary w-full"
        >
          Expansion curse reference
        </button>
      ) : null}

      {onExport ? (
        <button type="button" onClick={onExport} className="btn-secondary w-full">
          Export map
        </button>
      ) : null}

      <div className="space-y-2 border-t-2 border-border pt-4">
        {endGameBlocked ? (
          <p className="text-sm text-ink-muted">
            Clear map and reset board are unavailable during end game.
          </p>
        ) : null}
        {onClearMap ? (
          <button
            type="button"
            onClick={onClearMap}
            disabled={endGameBlocked}
            className="btn-secondary w-full border-status-error/50 bg-status-error-surface text-status-error disabled:opacity-50"
          >
            Clear map
          </button>
        ) : null}

        {isHost ? (
          <>
            <button
              type="button"
              onClick={() => setResetMenuOpen((open) => !open)}
              aria-expanded={resetMenuOpen}
              className="btn-secondary w-full border-status-warning/50 bg-status-warning-surface text-status-warning"
            >
              Reset…
            </button>
            {resetMenuOpen ? (
              <div className="space-y-2 border-l-2 border-status-warning/40 pl-3">
                <button
                  type="button"
                  onClick={() => {
                    setResetMenuOpen(false);
                    onResetBoard?.();
                  }}
                  disabled={endGameBlocked}
                  className="btn-secondary w-full border-status-warning/50 bg-status-warning-surface text-status-warning disabled:opacity-50"
                >
                  Reset board for everyone
                </button>
                {remoteSession && onResetSession ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setResetMenuOpen(false);
                        void onResetSession();
                      }}
                      className="btn-secondary w-full border-status-error/50 bg-status-error-surface text-status-error"
                    >
                      Reset session progress
                    </button>
                    <p className="text-xs leading-relaxed text-ink-muted">
                      Reset session keeps the code and roster. It clears timer,
                      map, questions, chat, zones, traps, and end-game state.
                    </p>
                  </>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={onEndSession}
              className="btn-secondary w-full border-status-error/50 bg-status-error-surface text-status-error"
            >
              End session for everyone
            </button>
          </>
        ) : null}

        {onLeaveSession ? (
          <button
            type="button"
            onClick={onLeaveSession}
            className="btn-secondary w-full"
          >
            Leave session
          </button>
        ) : null}
      </div>
    </div>
  );
}
