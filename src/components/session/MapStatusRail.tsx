import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { mapToolPlacingLabel } from "../../domain/mapTools";
import type { SyncStatus } from "../../domain/sync";
import type { TimerState } from "../../domain/timer";
import type { MapTool } from "../../state/sessionStore";
import type { PendingQuestionRecord } from "../../domain/sessionChat";
import { HudHomeIcon, HudPlayIcon } from "../ui/HudIcons";
import { PopupCloseButton } from "../ui/PopupCloseButton";
import { TimerActions } from "../tools/TimerActions";
import { SessionTimerLabel } from "./SessionTimerLabel";
import { MapTimerCluster } from "./MapTimerCluster";
import { QuestionAlertBanner } from "./QuestionAlertBanner";
import { GameAreaPreloadBanner } from "./GameAreaPreloadBanner";

import type { GameSize } from "../../domain/gameSize";
import type { PlayerRole } from "../../domain/playerRole";

interface MapStatusRailProps {
  sessionCode: string;
  gameSize?: GameSize;
  playerRole?: PlayerRole;
  activeTool: MapTool;
  syncStatus: SyncStatus;
  queuedWrites: number;
  message?: string | null;
  timerState: TimerState;
  timerRunning: boolean;
  timerHasStarted: boolean;
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
}

type SyncTone = "error" | "warning" | "info";

function syncToneForStatus(status: SyncStatus): SyncTone {
  if (status === "error") {
    return "error";
  }
  if (status === "offline" || status === "degraded") {
    return "warning";
  }
  return "info";
}

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

export function MapStatusRail({
  sessionCode,
  gameSize = "medium",
  playerRole = "seeker",
  activeTool,
  syncStatus,
  queuedWrites,
  message,
  timerState,
  timerRunning,
  timerHasStarted,
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
}: MapStatusRailProps) {
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const placing = activeTool !== "none";
  const modeLabel = placing
    ? mapToolPlacingLabel(activeTool)
    : idleModeLabel(playerRole);
  const sync = syncRailDisplay(syncStatus, queuedWrites, message);
  const showTimerMenu = timerMenuOpen && !closeTimerMenu;

  useEffect(() => {
    if (!showTimerMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (railRef.current && !railRef.current.contains(event.target as Node)) {
        setTimerMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTimerMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showTimerMenu]);

  return (
    <div
      ref={railRef}
      className="jl-status-rail pointer-events-none absolute inset-x-0 top-0 z-[var(--z-banner)] bg-surface-deep pt-[max(0px,env(safe-area-inset-top))]"
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
          <div className="jl-status-bar-inner">
            <Link
              to="/"
              className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-transparent text-ink transition-colors hover:border-border hover:bg-surface-raised"
              aria-label="Home"
            >
              <HudHomeIcon className="h-5 w-5" />
            </Link>

            <div className="jl-stamp">
              <span className="jl-stamp-label">Session</span>
              <span className="jl-stamp-code">{sessionCode}</span>
            </div>

            <p
              className={`jl-mode-ticker flex-1 ${
                placing ? "text-highlight" : "text-ink-muted"
              }`}
            >
              {modeLabel}
            </p>

            {!timerHasStarted ? (
              canStartGame ? (
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
                gameSize={gameSize}
                timerState={timerState}
                timerRunning={timerRunning}
                timerHasStarted={timerHasStarted}
                pendingQuestions={pendingQuestions}
                onOpenTimerMenu={() => setTimerMenuOpen((open) => !open)}
                timerMenuOpen={showTimerMenu}
              />
            )}

            {sync.inline?.visible && sync.inline.label ? (
              <p
                className={`max-w-[4.5rem] shrink-0 truncate text-[10px] font-semibold uppercase tracking-wide sm:max-w-[8rem] sm:text-xs ${SYNC_TONE_CLASSES[sync.inline.tone].text}`}
                title={sync.inline.label}
                aria-live="polite"
              >
                {sync.inline.label}
              </p>
            ) : null}
          </div>
        </div>

        {sync.banner?.visible ? (
          <p
            className={`pointer-events-auto mx-3 mt-1.5 border-2 px-3 py-2 text-center text-sm font-semibold text-pretty ${SYNC_TONE_CLASSES[sync.banner.tone].surface} ${SYNC_TONE_CLASSES[sync.banner.tone].border} ${SYNC_TONE_CLASSES[sync.banner.tone].text}`}
            role="status"
            aria-live="polite"
          >
            {sync.banner.label}
          </p>
        ) : null}

        <QuestionAlertBanner
          pendingQuestions={pendingQuestions}
          gameSize={gameSize}
        />

        {showPreloadBanner ? <GameAreaPreloadBanner /> : null}
      </div>
    </div>
  );
}
