import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SyncStatus } from "@/domain/device/sync/sync";
import type { TimerState } from "@/domain/session/timer/timer";
import type { MapTool } from "@/state/sessionStore";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
} from "@/domain/session/activity/sessionChat";
import { ScreenNav } from "../../ui/layout/ScreenNav";
import { GameAreaPreloadBeacon } from "../preload/GameAreaPreloadBeacon";
import { HudErrorBanner } from "../../ui/banners/HudErrorBanner";
import { userErrorFromSyncMessage } from "@/domain/device/feedback/userErrors";
import type { SessionRulesInput } from "@/domain/session/rules";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import type { RoleGates } from "@/domain/session/players/roleGates";
import { useLeaderJoinRequests } from "@/hooks/map-screen/useLeaderJoinRequests";
import { EndGameAlert } from "../status/EndGameAlert";
import { FoundHiderAlert } from "../status/FoundHiderAlert";
import { HiderOutsideZoneAlert } from "../status/HiderOutsideZoneAlert";
import { RoleJoinRequestAlert } from "../status/RoleJoinRequestAlert";
import { SyncBlock } from "../status/SyncBlock";
import { TimerBlock } from "../status/TimerBlock";
import { ToolStatusBlock } from "../status/ToolStatusBlock";
import { SYNC_TONE_CLASSES, syncRailDisplay } from "../status/syncRailDisplay";

/** Role-agnostic status/timer/sync bag for MapStatusRail (W4-A peel). */
export type MapStatusRailModel = {
  sessionCode: string;
  sessionId?: string | null;
  roleGates?: RoleGates | null;
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
  endGameActive?: boolean;
  myUid?: string;
  hostUid?: string | null;
  seekerLocations?: readonly PlayerLocationRecord[];
  onCancelWalkingQuestion?: (pendingQuestionId: string) => void;
  isHost?: boolean;
  onResetEndGame?: () => void;
  foundHiderPending?: boolean;
  foundRequestedByUid?: string;
  onAcceptFoundHider?: () => void;
  onDeclineFoundHider?: () => void;
  hiderOutsideZone?: boolean;
  onSyncErrorAction?: () => void;
  /** Dim chrome and block tool/timer interaction when the session is gone. */
  inactiveChrome?: boolean;
  terminalSessionError?:
    import("@/domain/device/feedback/userErrors").UserErrorDisplay | null;
  onReturnToJoin?: () => void;
  /** In-flow status for DesktopOpsShell (vs absolute overlay on mobile). */
  expanded?: boolean;
  /** Synced hiding-zone Move card — drives PHASE=MOVE in status chrome. */
  moveInProgress?: boolean;
};

export type MapStatusRailProps = {
  model: MapStatusRailModel;
  /** Replace default in-header home ScreenNav (e.g. observer leave control). */
  headerLeading?: ReactNode;
};

export function MapStatusRail({ model, headerLeading }: MapStatusRailProps) {
  const {
    sessionCode,
    sessionId = null,
    roleGates = null,
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
    myUid,
    hostUid = null,
    seekerLocations = [],
    onCancelWalkingQuestion,
    isHost = false,
    onResetEndGame,
    foundHiderPending = false,
    foundRequestedByUid,
    onAcceptFoundHider,
    onDeclineFoundHider,
    hiderOutsideZone = false,
    onSyncErrorAction,
    inactiveChrome = false,
    terminalSessionError = null,
    onReturnToJoin,
    expanded = false,
    moveInProgress = false,
  } = model;
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);
  const [preloadMenuOpen, setPreloadMenuOpen] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const {
    pendingJoinRequest,
    joinRequestBusy,
    joinRequestError,
    handleAcceptJoinRequest,
    handleDeclineJoinRequest,
  } = useLeaderJoinRequests({
    sessionId,
    roleGates,
    myUid,
    isHost,
  });
  const sync = syncRailDisplay(syncStatus, queuedWrites, message);
  const syncErrorDisplay = userErrorFromSyncMessage(message);
  const showTerminalBanner =
    inactiveChrome &&
    terminalSessionError &&
    onSyncErrorAction &&
    onReturnToJoin;
  const showTimerMenu = timerMenuOpen && !closeTimerMenu;
  const showPreloadMenu = preloadMenuOpen && !closeTimerMenu;

  const closeOtherMenus = () => {
    setTimerMenuOpen(false);
    setPreloadMenuOpen(false);
  };

  useEffect(() => {
    if (!showTimerMenu && !showPreloadMenu) {
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
  }, [showPreloadMenu, showTimerMenu]);

  const railClassName = `jl-status-rail pointer-events-none z-[var(--z-banner)]${
    expanded ? " jl-status-rail--expanded" : " absolute inset-x-0 top-0"
  }${
    inactiveChrome
      ? " [&_.jl-status-header-col--timer_.jl-ticker]:pointer-events-none [&_.jl-status-header-col--timer_.jl-ticker]:opacity-55 [&_.jl-status-header-col--timer_button]:pointer-events-none [&_.jl-status-header-col--timer_button]:opacity-55"
      : ""
  }`;

  return (
    <div
      ref={railRef}
      className={railClassName}
      data-testid="map-status-rail-mantine"
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
          disabled={timerControlsDisabled || inactiveChrome}
        />

        <div
          className="w-full"
          style={{
            paddingTop: "max(0.5rem, env(safe-area-inset-top))",
            paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
            paddingRight: "max(0.75rem, env(safe-area-inset-right))",
            paddingBottom: "0.25rem",
          }}
        >
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
            moveInProgress={moveInProgress}
            onTimerPause={onTimerPause}
            onTimerResume={onTimerStart}
            timerControlsDisabled={timerControlsDisabled || inactiveChrome}
            headerLeading={
              headerLeading ?? <ScreenNav variant="home" placement="inline" />
            }
            syncSlot={
              <SyncBlock
                syncStatus={syncStatus}
                queuedWrites={queuedWrites}
                message={message}
                placement="segment"
              />
            }
            onOpenTimerMenu={() => {
              if (inactiveChrome) {
                return;
              }
              setTimerMenuOpen((open) => !open);
              setPreloadMenuOpen(false);
            }}
          />
        </div>

        {showPreloadBanner ? (
          <GameAreaPreloadBeacon
            detailOpen={showPreloadMenu}
            onDetailOpenChange={(open) => {
              setPreloadMenuOpen(open);
              if (open) {
                setTimerMenuOpen(false);
              }
            }}
          />
        ) : null}

        {showTerminalBanner ? (
          <HudErrorBanner
            error={terminalSessionError}
            onAction={onSyncErrorAction}
            onSecondaryAction={onReturnToJoin}
          />
        ) : sync.banner?.visible ? (
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
          endGameActive={endGameActive}
          isHost={isHost}
          playerRole={playerRole}
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

        <RoleJoinRequestAlert
          request={pendingJoinRequest}
          busy={joinRequestBusy}
          error={joinRequestError}
          onAccept={handleAcceptJoinRequest}
          onDecline={handleDeclineJoinRequest}
        />
      </div>
    </div>
  );
}
