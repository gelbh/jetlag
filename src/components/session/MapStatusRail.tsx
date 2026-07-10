import { useEffect, useRef, useState } from "react";
import { mapToolPlacingLabel } from "../../domain/map/mapTools";
import type { SyncStatus } from "../../domain/device/sync";
import type { TimerState } from "../../domain/session/timer";
import type { MapTool } from "../../state/sessionStore";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import { HudPlayIcon } from "../ui/HudIcons";
import { ScreenNav } from "../ui/ScreenNav";
import { PopupCloseButton } from "../ui/PopupCloseButton";
import { TimerActions } from "../tools/TimerActions";
import { SessionTimerLabel } from "./SessionTimerLabel";
import { MapTimerCluster } from "./MapTimerCluster";
import { GameAreaPreloadBeacon } from "./GameAreaPreloadBeacon";
import { SyncStatusBeacon } from "./SyncStatusDot";
import { SyncStatusDetailPanel } from "./SyncStatusDetailPanel";
import {
  syncDetailContent,
  syncToneForStatus,
} from "./syncStatusDetailContent";
import { HudErrorBanner } from "../ui/HudErrorBanner";
import { userErrorFromSyncMessage } from "../../domain/device/userErrors";

import type { SessionRulesInput } from "../../domain/session/sessionRules";
import type { PlayerRole } from "../../domain/session/playerRole";

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
  /** When true, closes the timer settings dropdown (e.g. another overlay opened). */
  closeTimerMenu?: boolean;
  showPreloadBanner?: boolean;
  endGamePending?: boolean;
  endGameActive?: boolean;
  endGameRequestedByUid?: string;
  myUid?: string;
  isHost?: boolean;
  onAcceptEndGame?: () => void;
  onResetEndGame?: () => void;
  hiderOutsideZone?: boolean;
  onSyncErrorAction?: () => void;
}

type SyncTone = "error" | "warning" | "info";

const SYNC_TONE_CLASSES: Record<
  SyncTone,
  { text: string; surface: string; border: string }
> = {
  error: {
    text: "text-status-error",
    surface: "bg-status-error-surface",
    border: "border-status-error/40",
  },
  warning: {
    text: "text-status-warning",
    surface: "bg-status-warning-surface",
    border: "border-status-warning/40",
  },
  info: {
    text: "text-status-info",
    surface: "bg-status-info-surface",
    border: "border-status-info/40",
  },
};

function syncRailDisplay(
  status: SyncStatus,
  queuedWrites: number,
  message?: string | null,
): {
  inline: { visible: boolean; label: string | null; tone: SyncTone } | null;
  banner: { visible: boolean; label: string; tone: SyncTone } | null;
} {
  if (message) {
    const tone = syncToneForStatus(status);
    return {
      inline: null,
      banner: { visible: true, label: message, tone },
    };
  }

  if (status === "error") {
    return {
      inline: {
        visible: true,
        label: "Sync failed",
        tone: "error",
      },
      banner: null,
    };
  }

  if (status === "offline") {
    return {
      inline: {
        visible: true,
        label:
          queuedWrites > 0
            ? `Offline · ${queuedWrites} queued`
            : "Offline",
        tone: "warning",
      },
      banner: null,
    };
  }

  if (status === "degraded") {
    return {
      inline: {
        visible: true,
        label:
          queuedWrites > 0
            ? `Unstable · ${queuedWrites} queued`
            : "Unstable",
        tone: "warning",
      },
      banner: null,
    };
  }

  if (status === "saving") {
    return {
      inline: {
        visible: true,
        label: "Saving…",
        tone: "info",
      },
      banner: null,
    };
  }

  return { inline: null, banner: null };
}

function idleModeLabel(playerRole: PlayerRole): string {
  return playerRole === "hider" ? "Set your zone" : "Ready to seek";
}

function syncBeaconAriaLabel(status: SyncStatus): string {
  switch (status) {
    case "synced":
      return "Synced. Show sync details";
    case "saving":
      return "Saving changes. Show sync details";
    case "offline":
      return "Offline. Show sync details";
    case "degraded":
      return "Unstable connection. Show sync details";
    case "error":
      return "Sync failed. Show sync details";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
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
  isHost = false,
  onAcceptEndGame,
  onResetEndGame,
  hiderOutsideZone = false,
  onSyncErrorAction,
}: MapStatusRailProps) {
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);
  const [syncMenuOpen, setSyncMenuOpen] = useState(false);
  const [preloadMenuOpen, setPreloadMenuOpen] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const placing = activeTool !== "none";
  const modeLabel = placing
    ? mapToolPlacingLabel(activeTool)
    : idleModeLabel(playerRole);
  const sync = syncRailDisplay(syncStatus, queuedWrites, message);
  const syncErrorDisplay = userErrorFromSyncMessage(message);
  const syncDetail = syncDetailContent(
    syncStatus,
    queuedWrites,
    message,
    syncErrorDisplay,
  );
  const showSyncDot =
    syncStatus === "synced" ||
    sync.inline?.visible ||
    syncStatus === "error" ||
    syncStatus === "offline" ||
    syncStatus === "degraded" ||
    syncStatus === "saving";
  const showTimerMenu = timerMenuOpen && !closeTimerMenu;
  const showSyncMenu = syncMenuOpen && !closeTimerMenu;
  const showPreloadMenu = preloadMenuOpen && !closeTimerMenu;
  const syncActionLabel =
    syncErrorDisplay?.actionLabel ??
    (syncStatus === "offline" || syncStatus === "degraded" || syncStatus === "error"
      ? "Retry"
      : null);

  useEffect(() => {
    if (!showTimerMenu && !showSyncMenu && !showPreloadMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (railRef.current && !railRef.current.contains(event.target as Node)) {
        setTimerMenuOpen(false);
        setSyncMenuOpen(false);
        setPreloadMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTimerMenuOpen(false);
        setSyncMenuOpen(false);
        setPreloadMenuOpen(false);
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
        {showTimerMenu ? (
          <div
            className="hud-panel pointer-events-auto absolute inset-x-3 top-[calc(100%+0.375rem)] z-[var(--z-panel)] mx-auto max-w-md space-y-2 p-3 pt-10"
            role="menu"
            aria-label="Timer settings"
          >
            <PopupCloseButton
              label="Close timer settings"
              onClick={() => setTimerMenuOpen(false)}
            />
            <p className="px-1 font-mono text-2xl font-bold tabular-nums text-ink">
              <SessionTimerLabel timerState={timerState} />
            </p>
            <TimerActions
              timerRunning={timerRunning}
              timerHasStarted={timerHasStarted}
              onTimerStart={onTimerStart}
              onTimerPause={onTimerPause}
              onTimerReset={onTimerReset}
              onOpenLog={onOpenLog}
              disabled={timerControlsDisabled}
            />
          </div>
        ) : null}

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
          {showSyncDot ? (
            <div className="jl-sync-map-indicator">
              <button
                type="button"
                className={`jl-sync-map-indicator__btn${showSyncMenu ? " jl-sync-map-indicator__btn--open" : ""}`}
                onClick={() => {
                  setSyncMenuOpen((open) => !open);
                  setTimerMenuOpen(false);
                  setPreloadMenuOpen(false);
                }}
                aria-expanded={showSyncMenu}
                aria-haspopup="dialog"
                aria-label={syncBeaconAriaLabel(syncStatus)}
              >
                <SyncStatusBeacon status={syncStatus} size="md" />
              </button>

              {showSyncMenu ? (
                <SyncStatusDetailPanel
                  status={syncStatus}
                  title={syncDetail.title}
                  body={syncDetail.body}
                  actionLabel={syncActionLabel}
                  onAction={
                    syncActionLabel && onSyncErrorAction
                      ? () => {
                          onSyncErrorAction();
                          setSyncMenuOpen(false);
                        }
                      : undefined
                  }
                  onClose={() => setSyncMenuOpen(false)}
                />
              ) : null}
            </div>
          ) : null}
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
                  onOpenTimerMenu={() => {
                    setTimerMenuOpen((open) => !open);
                    setSyncMenuOpen(false);
                    setPreloadMenuOpen(false);
                  }}
                  timerMenuOpen={showTimerMenu}
                />
              )}
            </div>
          </div>
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

        {hiderOutsideZone ? (
          <p
            className="map-float-alert pointer-events-auto mx-3 mt-1.5 border-2 border-status-warning/40 bg-status-warning-surface px-3 py-2 text-center text-sm font-semibold text-status-warning"
            role="status"
          >
            You&apos;re outside your hiding zone. Use a move card to relocate.
          </p>
        ) : null}

        {endGamePending && playerRole === "hider" && onAcceptEndGame ? (
          <div className="map-float-alert pointer-events-auto mx-3 mt-1.5 flex items-center justify-between gap-3 border-2 border-highlight bg-surface-deep px-3 py-2">
            <p className="text-sm font-semibold text-ink">
              Seekers requested end game
            </p>
            <div className="flex shrink-0 gap-2">
              {onResetEndGame ? (
                <button
                  type="button"
                  onClick={onResetEndGame}
                  className="btn-secondary min-h-10 px-3 text-xs"
                >
                  Decline
                </button>
              ) : null}
              <button
                type="button"
                onClick={onAcceptEndGame}
                className="btn-primary min-h-10 shrink-0 px-3 text-xs"
              >
                Accept
              </button>
            </div>
          </div>
        ) : endGamePending && myUid && endGameRequestedByUid === myUid && onResetEndGame ? (
          <div className="map-float-alert pointer-events-auto mx-3 mt-1.5 flex items-center justify-between gap-3 border-2 border-highlight bg-surface-deep px-3 py-2">
            <p className="text-sm font-semibold text-ink">
              Waiting for hider to accept end game
            </p>
            <button
              type="button"
              onClick={onResetEndGame}
              className="btn-secondary min-h-10 shrink-0 px-3 text-xs"
            >
              Cancel request
            </button>
          </div>
        ) : endGamePending && isHost && onResetEndGame ? (
          <div className="map-float-alert pointer-events-auto mx-3 mt-1.5 flex items-center justify-between gap-3 border-2 border-highlight bg-surface-deep px-3 py-2">
            <p className="text-sm font-semibold text-ink">
              End game pending hider acceptance
            </p>
            <button
              type="button"
              onClick={onResetEndGame}
              className="btn-secondary min-h-10 shrink-0 px-3 text-xs"
            >
              Cancel end game
            </button>
          </div>
        ) : endGamePending ? (
          <p
            className="map-float-alert pointer-events-auto mx-3 mt-1.5 border-2 border-highlight bg-surface-deep px-3 py-2 text-center text-sm font-semibold text-ink"
            role="status"
          >
            Waiting for hider to accept end game
          </p>
        ) : null}

        {endGameActive ? (
          isHost && onResetEndGame ? (
            <div className="map-float-alert pointer-events-auto mx-3 mt-1.5 flex items-center justify-between gap-3 border-2 border-highlight bg-surface-deep px-3 py-2">
              <p className="text-sm font-semibold text-ink">End game started</p>
              <button
                type="button"
                onClick={onResetEndGame}
                className="btn-secondary min-h-10 shrink-0 px-3 text-xs"
              >
                End end game
              </button>
            </div>
          ) : (
            <p
              className="map-float-alert pointer-events-auto mx-3 mt-1.5 border-2 border-highlight bg-surface-deep px-3 py-2 text-center text-sm font-semibold text-ink"
              role="status"
            >
              End game started
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}
