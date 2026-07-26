import type { MapTool } from "../../../state/sessionStore";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
} from "../../../domain/session/sessionChat";
import type { SessionRulesInput } from "../../../domain/session/sessionRules";
import {
  computeElapsedMs,
  type TimerState,
} from "../../../domain/session/timer";
import {
  isHidingPeriodActive,
} from "../../../domain/session/hidingPeriod";
import {
  playerRoleLabel,
  type PlayerRole,
} from "../../../domain/session/playerRole";
import { HudPlayIcon } from "../../ui/HudIcons";
import { MapTimerCluster } from "../MapTimerCluster";

interface ToolStatusBlockProps {
  sessionCode: string;
  playerRole: PlayerRole;
  activeTool: MapTool;
  timerState: TimerState;
  timerRunning: boolean;
  timerHasStarted: boolean;
  timerSyncing: boolean;
  canStartGame: boolean;
  onStartGame: () => void;
  sessionRules: SessionRulesInput;
  pendingQuestions: readonly PendingQuestionRecord[];
  myUid?: string | null;
  hostUid?: string | null;
  seekerLocations?: readonly PlayerLocationRecord[];
  onCancelWalkingQuestion?: (pendingQuestionId: string) => void;
  timerMenuOpen: boolean;
  onOpenTimerMenu: () => void;
  /** Show role + mode inline (desktop ops status). */
  expanded?: boolean;
}

function phaseLabel(
  timerHasStarted: boolean,
  sessionRules: SessionRulesInput,
  timerState: TimerState,
): string {
  if (!timerHasStarted) {
    return "—";
  }
  const elapsed = computeElapsedMs(timerState);
  return isHidingPeriodActive(sessionRules, elapsed) ? "HIDE" : "SEEK";
}

export function ToolStatusBlock({
  sessionCode,
  playerRole,
  activeTool: _activeTool,
  timerState,
  timerRunning,
  timerHasStarted,
  timerSyncing,
  canStartGame,
  onStartGame,
  sessionRules,
  pendingQuestions,
  myUid = null,
  hostUid = null,
  seekerLocations = [],
  onCancelWalkingQuestion,
  timerMenuOpen,
  onOpenTimerMenu,
  expanded = false,
}: ToolStatusBlockProps) {
  void _activeTool;
  void expanded;
  const phase = phaseLabel(timerHasStarted, sessionRules, timerState);
  const phaseClass =
    phase === "HIDE"
      ? "jl-status-header-value jl-status-header-value--action"
      : "jl-status-header-value";

  return (
    <div className="jl-status-header">
      <div className="jl-status-header-brand">
        <span className="jl-status-header-brand-mark" aria-hidden>
          ▸
        </span>
        <div className="jl-status-header-brand-text">
          <span className="jl-status-header-brand-name">JETLAG</span>
          <span className="jl-status-header-brand-role">
            {playerRoleLabel(playerRole)}
          </span>
        </div>
      </div>

      <div className="jl-status-header-col">
        <span className="jl-status-header-label">OPERATION</span>
        <span className="jl-status-header-value jl-stamp-code jl-view-transition-session-code">
          {sessionCode}
        </span>
      </div>

      <div className="jl-status-header-col">
        <span className="jl-status-header-label">PHASE</span>
        <span className={phaseClass}>{phase}</span>
      </div>

      <div className="jl-status-header-col jl-status-header-col--timer">
        <span className="jl-status-header-label">TIME LEFT</span>
        {!timerHasStarted ? (
          timerSyncing ? (
            <p className="jl-status-header-waiting">Syncing…</p>
          ) : canStartGame ? (
            <button
              type="button"
              onClick={onStartGame}
              className="btn-primary min-h-10 shrink-0 px-3 text-xs sm:text-sm"
            >
              <HudPlayIcon className="h-4 w-4 shrink-0" />
              Start
            </button>
          ) : (
            <p className="jl-status-header-waiting">WAITING</p>
          )
        ) : (
          <MapTimerCluster
            sessionRules={sessionRules}
            timerState={timerState}
            timerRunning={timerRunning}
            timerHasStarted={timerHasStarted}
            pendingQuestions={pendingQuestions}
            myUid={myUid}
            hostUid={hostUid}
            seekerLocations={seekerLocations}
            onCancelWalkingQuestion={onCancelWalkingQuestion}
            onOpenTimerMenu={onOpenTimerMenu}
            timerMenuOpen={timerMenuOpen}
          />
        )}
      </div>
    </div>
  );
}
