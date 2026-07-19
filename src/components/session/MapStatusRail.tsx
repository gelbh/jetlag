import { useEffect, useRef, useState } from "react";
import type { SyncStatus } from "../../domain/device/sync";
import type { TimerState } from "../../domain/session/timer";
import type { MapTool } from "../../state/sessionStore";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
} from "../../domain/session/sessionChat";
import { ScreenNav } from "../ui/ScreenNav";
import { GameAreaPreloadBeacon } from "./GameAreaPreloadBeacon";
import { HudErrorBanner } from "../ui/HudErrorBanner";
import { userErrorFromSyncMessage } from "../../domain/device/userErrors";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import type { PlayerRole } from "../../domain/session/playerRole";
import { EndGameAlert } from "./status/EndGameAlert";
import { FoundHiderAlert } from "./status/FoundHiderAlert";
import { HiderOutsideZoneAlert } from "./status/HiderOutsideZoneAlert";
import { SyncBlock } from "./status/SyncBlock";
import { TimerBlock } from "./status/TimerBlock";
import { ToolStatusBlock } from "./status/ToolStatusBlock";
import { SYNC_TONE_CLASSES, syncRailDisplay } from "./status/syncRailDisplay";

interface MapStatusRailProps {
  sessionCode: string;
  sessionRules?: SessionRulesInput;
  playerRole?: PlayerRole;
  activeTool: MapTool;
  syncStatus: SyncStatus;
  queuedWrites: number;
  message?: string | null;
  timerState: TimerState;
  timerRunning: boolean;
  timerHasStarted: boolean;
  timerSyncing?: boolean;
  canStartGame: boolean;
  onStartGame: () => void;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerReset: () => void;
  timerControlsDisabled?: boolean;
  onOpenLog?: () => void;
  pendingQuestions?: readonly PendingQuestionRecord[];
  closeTimerMenu?: boolean;
  showPreloadBanner?: boolean;
  endGamePending?: boolean;
  endGameActive?: boolean;
  endGameRequestedByUid?: string;
  myUid?: string;
  hostUid?: string | null;
  seekerLocations?: readonly PlayerLocationRecord[];
  onCancelWalkingQuestion?: (pendingQuestionId: string) => void;
  isHost?: boolean;
  onAcceptEndGame?: () => void;
  onResetEndGame?: () => void;
  foundHiderPending?: boolean;
  foundRequestedByUid?: string;
  onAcceptFoundHider?: () => void;
  onDeclineFoundHider?: () => void;
  hiderOutsideZone?: boolean;
  onSyncErrorAction?: () => void;
}

export function MapStatusRail({
  sessionCode,
  sessionRules = { gameSize: "medium" },
  playerRole = "seeker",
  activeTool,
  syncStatus,
  queuedWrites,
  message,
  timerState,
  timerRunning,
  timerHasStarted,
  timerSyncing = false,
  canStartGame,
  onStartGame,
  onTimerStart,
  onTimerPause,
  onTimerReset,
  timerControlsDisabled = false,
  onOpenLog,
  pendingQuestions = [],
  closeTimerMenu = false,
  showPreloadBanner = false,
  endGameActive = false,
  endGamePending = false,
  endGameRequestedByUid,
  myUid,
  hostUid = null,
  seekerLocations = [],
  onCancelWalkingQuestion,
  isHost = false,
  onAcceptEndGame,
  onResetEndGame,
  foundHiderPending = false,
  foundRequestedByUid,
  onAcceptFoundHider,
  onDeclineFoundHider,
  hiderOutsideZone = false,
  onSyncErrorAction,
}: MapStatusRailProps) {
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);
  const [syncMenuOpen, setSyncMenuOpen] = useState(false);
  const [preloadMenuOpen, setPreloadMenuOpen] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const sync = syncRailDisplay(syncStatus, queuedWrites, message);
  const syncErrorDisplay = userErrorFromSyncMessage(message);
  const showTimerMenu = timerMenuOpen && !closeTimerMenu;
  const showSyncMenu = syncMenuOpen && !closeTimerMenu;
  const showPreloadMenu = preloadMenuOpen && !closeTimerMenu;

  const closeOtherMenus = () => {
    setTimerMenuOpen(false);
    setSyncMenuOpen(false);
    setPreloadMenuOpen(false);
  };

  useEffect(() => {
    if (!showTimerMenu && !showSyncMenu && !showPreloadMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (railRef.current && !railRef.current.contains(event.target as Node)) {
        closeOtherMenus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeOtherMenus();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showPreloadMenu, showSyncMenu, showTimerMenu]);

  return (
    <div
      ref={railRef}
      className="jl-status-rail pointer-events-none absolute inset-x-0 top-0 z-[var(--z-banner)] pt-[max(0px,env(safe-area-inset-top))]"
    >
      <div className="relative">
        <TimerBlock
          open={showTimerMenu}
          onClose={() => setTimerMenuOpen(false)}
          timerState={timerState}
          timerRunning={timerRunning}
          timerHasStarted={timerHasStarted}
          onTimerStart={onTimerStart}
          onTimerPause={onTimerPause}
          onTimerReset={onTimerReset}
          onOpenLog={onOpenLog}
          disabled={timerControlsDisabled}
        />

        <div className="jl-status-bar">
          <ScreenNav variant="home" />
          {showPreloadBanner ? (
            <GameAreaPreloadBeacon
              detailOpen={showPreloadMenu}
              onDetailOpenChange={(open) => {
                setPreloadMenuOpen(open);
                if (open) {
                  setTimerMenuOpen(false);
                  setSyncMenuOpen(false);
                }
              }}
            />
          ) : null}
          <SyncBlock
            syncStatus={syncStatus}
            queuedWrites={queuedWrites}
            message={message}
            menuOpen={showSyncMenu}
            onMenuOpenChange={(open) => {
              setSyncMenuOpen(open);
              if (open) {
                setTimerMenuOpen(false);
                setPreloadMenuOpen(false);
              }
            }}
            onSyncErrorAction={onSyncErrorAction}
          />
          <ToolStatusBlock
            sessionCode={sessionCode}
            playerRole={playerRole}
            activeTool={activeTool}
            timerState={timerState}
            timerRunning={timerRunning}
            timerHasStarted={timerHasStarted}
            timerSyncing={timerSyncing}
            canStartGame={canStartGame}
            onStartGame={onStartGame}
            sessionRules={sessionRules}
            pendingQuestions={pendingQuestions}
            myUid={myUid}
            hostUid={hostUid}
            seekerLocations={seekerLocations}
            onCancelWalkingQuestion={onCancelWalkingQuestion}
            timerMenuOpen={showTimerMenu}
            onOpenTimerMenu={() => {
              setTimerMenuOpen((open) => !open);
              setSyncMenuOpen(false);
              setPreloadMenuOpen(false);
            }}
          />
        </div>

        {sync.banner?.visible ? (
          syncErrorDisplay && onSyncErrorAction ? (
            <HudErrorBanner
              error={syncErrorDisplay}
              onAction={onSyncErrorAction}
            />
          ) : (
            <p
              className={`map-float-alert pointer-events-auto mx-3 mt-1.5 border-2 px-3 py-2 text-center text-sm font-semibold text-pretty ${SYNC_TONE_CLASSES[sync.banner.tone].surface} ${SYNC_TONE_CLASSES[sync.banner.tone].border} ${SYNC_TONE_CLASSES[sync.banner.tone].text}`}
              role="status"
              aria-live="polite"
            >
              {sync.banner.label}
            </p>
          )
        ) : null}

        {hiderOutsideZone ? <HiderOutsideZoneAlert /> : null}

        <EndGameAlert
          endGamePending={endGamePending}
          endGameActive={endGameActive}
          playerRole={playerRole}
          endGameRequestedByUid={endGameRequestedByUid}
          myUid={myUid}
          isHost={isHost}
          onAcceptEndGame={onAcceptEndGame}
          onResetEndGame={onResetEndGame}
        />

        <FoundHiderAlert
          foundHiderPending={foundHiderPending}
          playerRole={playerRole}
          foundRequestedByUid={foundRequestedByUid}
          myUid={myUid}
          isHost={isHost}
          onAcceptFoundHider={onAcceptFoundHider}
          onDeclineFoundHider={onDeclineFoundHider}
        />
      </div>
    </div>
  );
}
