import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { mapToolPlacingLabel } from "../../domain/mapTools";
import type { SyncStatus } from "../../domain/sync";
import type { TimerState } from "../../domain/timer";
import type { MapTool } from "../../state/sessionStore";
import { HudHomeIcon, HudPlayIcon } from "../ui/HudIcons";
import { PopupCloseButton } from "../ui/PopupCloseButton";
import { TimerActions } from "../tools/TimerActions";
import { SessionTimerLabel } from "./SessionTimerLabel";

interface MapStatusRailProps {
  sessionCode: string;
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
            ? `Connection unstable · ${queuedWrites} queued`
            : "Connection unstable",
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

export function MapStatusRail({
  sessionCode,
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
}: MapStatusRailProps) {
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const placing = activeTool !== "none";
  const modeLabel = placing
    ? `Placing ${mapToolPlacingLabel(activeTool)}`
    : "Tap pin or zone";
  const sync = syncRailDisplay(syncStatus, queuedWrites, message);

  useEffect(() => {
    if (!timerMenuOpen) {
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
  }, [timerMenuOpen]);

  return (
    <div
      ref={railRef}
      className="pointer-events-none absolute inset-x-0 top-0 z-[var(--z-banner)] px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
    >
      <div className="relative mx-auto w-full max-w-xl">
        {timerMenuOpen ? (
          <div
            className="hud-panel pointer-events-auto absolute inset-x-0 top-[calc(100%+var(--chrome-gap-above-dock))] z-[var(--z-panel)] space-y-2 p-3 pt-10"
            role="menu"
            aria-label="Timer settings"
          >
            <PopupCloseButton
              label="Close timer settings"
              onClick={() => setTimerMenuOpen(false)}
            />
            <p className="px-1 font-mono text-lg tabular-nums text-ink">
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

        <div className="map-status-rail pointer-events-auto flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-[var(--radius-hud-lg)] border border-border bg-surface-panel px-2 py-1.5 shadow-[var(--shadow-hud-float)]">
        <Link
          to="/"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-hud-md)] text-ink transition-colors hover:bg-surface-raised"
          aria-label="Home"
        >
          <HudHomeIcon className="h-5 w-5" />
        </Link>

        <div
          className="hidden h-5 w-px shrink-0 bg-border sm:block"
          aria-hidden="true"
        />

        <div className="flex min-w-0 shrink-0 flex-col leading-tight">
          <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-ink-dim">
            Session
          </span>
          <span className="font-mono text-sm font-medium tabular-nums text-ink">
            {sessionCode}
          </span>
        </div>

        <div className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />

        {!timerHasStarted ? (
          canStartGame ? (
            <button
              type="button"
              onClick={onStartGame}
              className="btn-primary dock-start-game min-h-10 shrink-0 px-3 text-sm sm:min-h-11"
            >
              <HudPlayIcon className="h-4 w-4 shrink-0" />
              Start game
            </button>
          ) : (
            <p className="dock-waiting-host max-w-[7rem] shrink-0 px-2 text-xs sm:max-w-none sm:text-sm">
              Waiting for host…
            </p>
          )
        ) : (
          <button
            type="button"
            onClick={() => setTimerMenuOpen((open) => !open)}
            className={`hud-chrome min-h-10 shrink-0 px-2 font-mono text-xs tabular-nums shadow-none sm:min-h-11 sm:px-3 sm:text-sm ${
              timerRunning ? "hud-chrome-active" : ""
            }`}
            aria-label="Elapsed time. Open timer settings"
            aria-expanded={timerMenuOpen}
            aria-haspopup="menu"
            aria-live="polite"
          >
            <SessionTimerLabel timerState={timerState} />
          </button>
        )}

        <div className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />

        <p
          className={`min-w-0 flex-1 truncate text-sm font-medium ${
            placing ? "text-status-info" : "text-ink-secondary"
          }`}
        >
          {modeLabel}
        </p>

        {sync.inline?.visible && sync.inline.label ? (
          <>
            <div
              className="hidden h-5 w-px shrink-0 bg-border sm:block"
              aria-hidden="true"
            />
            <p
              className={`max-w-[7rem] shrink-0 truncate text-xs font-medium sm:max-w-[10rem] sm:text-sm ${SYNC_TONE_CLASSES[sync.inline.tone].text}`}
              title={sync.inline.label}
            >
              {sync.inline.label}
            </p>
          </>
        ) : null}
        </div>
      </div>

      {sync.banner?.visible ? (
        <p
          className={`pointer-events-auto mx-auto mt-1.5 w-full max-w-xl rounded-[var(--radius-hud-xl)] border px-3 py-2 text-center text-sm font-medium text-pretty ${SYNC_TONE_CLASSES[sync.banner.tone].surface} ${SYNC_TONE_CLASSES[sync.banner.tone].border} ${SYNC_TONE_CLASSES[sync.banner.tone].text}`}
          role="status"
          aria-live="polite"
        >
          {sync.banner.label}
        </p>
      ) : null}
    </div>
  );
}
