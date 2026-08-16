import type { ReactNode } from "react";
import type { MapTool } from "@/state/sessionStore";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
} from "@/domain/session/activity/sessionChat";
import type { SessionRulesInput } from "@/domain/session/rules";
import { type TimerState } from "@/domain/session/timer/timer";
import {
  playerRoleLabel,
  type PlayerRole,
} from "@/domain/session/players/playerRole";
import { Play } from "@phosphor-icons/react";
import { surveyPhaseLabel } from "@/domain/device/surveyStatusCopy";
import { JlIcon } from "../../ui/brand/JlIcon";
import { MapTimerCluster } from "../mapChrome/MapTimerCluster";

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
  /** Hider Play Move in progress — PHASE shows MOVE for all roles. */
  moveInProgress?: boolean;
  /** Show role + mode inline (desktop ops status). */
  expanded?: boolean;
  /** Home / leave control rendered leading in the brand cell. */
  headerLeading?: ReactNode;
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
  moveInProgress = false,
  expanded = false,
  headerLeading,
}: ToolStatusBlockProps) {
  void _activeTool;
  void expanded;
  const phase = surveyPhaseLabel(
    timerHasStarted,
    sessionRules,
    timerState,
    moveInProgress,
  );
  const phaseClass =
    phase === "Hiding" || phase === "Moving"
      ? "jl-status-header-value jl-status-header-value--action"
      : "jl-status-header-value";

  return (
    <div className="jl-status-header">
      <div className="jl-status-header-brand">
        {headerLeading}
        <div className="jl-status-header-brand-text">
          <span className="jl-status-header-brand-name">Jetlag</span>
          <span className="jl-status-header-brand-role">
            {playerRoleLabel(playerRole)}
          </span>
        </div>
      </div>

      <div className="jl-status-header-col">
        <span className="jl-status-header-label">Session</span>
        <span className="jl-status-header-value jl-stamp-code jl-view-transition-session-code">
          {sessionCode}
        </span>
      </div>

      <div className="jl-status-header-col">
        <span className="jl-status-header-label">Phase</span>
        <span className={phaseClass}>{phase}</span>
      </div>

      <div className="jl-status-header-col jl-status-header-col--timer">
        <span className="jl-status-header-label">Time left</span>
        {!timerHasStarted ? (
          timerSyncing ? (
            <p className="jl-status-header-waiting">Syncing…</p>
          ) : canStartGame ? (
            <button
              type="button"
              onClick={onStartGame}
              className="btn-primary jl-status-header-start min-h-11 shrink-0 px-3 text-xs sm:text-sm"
            >
              <JlIcon icon={Play} size={16} weight="bold" />
              Start
            </button>
          ) : (
            <p className="jl-status-header-waiting">Waiting</p>
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
