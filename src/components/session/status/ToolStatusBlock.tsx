import type { MapTool } from "../../../state/sessionStore";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
} from "../../../domain/session/sessionChat";
import type { SessionRulesInput } from "../../../domain/session/sessionRules";
import type { TimerState } from "../../../domain/session/timer";
import type { PlayerRole } from "../../../domain/session/playerRole";
import { mapToolPlacingLabel } from "../../../domain/map/mapTools";
import { HudPlayIcon } from "../../ui/HudIcons";
import { MapTimerCluster } from "../MapTimerCluster";
import { idleModeLabel } from "./syncRailDisplay";

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
}

export function ToolStatusBlock({
  sessionCode,
  playerRole,
  activeTool,
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
}: ToolStatusBlockProps) {
  const placing = activeTool !== "none";
  const modeLabel = placing
    ? mapToolPlacingLabel(activeTool)
    : idleModeLabel(playerRole);

  return (
    <div className="jl-status-bar-inner pl-[calc(2.75rem+max(0.625rem,env(safe-area-inset-left)))]">
      <div className="jl-stamp">
        <span className="jl-stamp-label">Session</span>
        <span className="jl-stamp-code jl-view-transition-session-code">
          {sessionCode}
        </span>
      </div>

      <p
        className={`jl-mode-ticker min-w-0 flex-1 ${
          placing ? "text-highlight" : "text-ink-muted"
        } ${timerHasStarted ? "sr-only" : ""}`}
      >
        {modeLabel}
      </p>

      <div className="jl-status-bar-timer">
        {!timerHasStarted ? (
          timerSyncing ? (
            <p className="dock-waiting-host max-w-[6.5rem] shrink-0 px-2 text-[10px] sm:max-w-none">
              Syncing timer…
            </p>
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
            <p className="dock-waiting-host max-w-[6.5rem] shrink-0 px-2 text-[10px] sm:max-w-none">
              Waiting…
            </p>
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
