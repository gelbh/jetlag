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

function syncRailSegment(
  status: SyncStatus,
  queuedWrites: number,
  message?: string | null,
): { visible: boolean; label: string | null; tone: string } {
  if (message) {
    const tone =
      status === "error"
        ? "text-status-error"
        : status === "offline"
          ? "text-status-warning"
          : "text-status-info";
    return { visible: true, label: message, tone };
  }

  if (status === "error") {
    return {
      visible: true,
      label: "Sync failed",
      tone: "text-status-error",
    };
  }

  if (status === "offline") {
    return {
      visible: true,
      label:
        queuedWrites > 0
          ? `Offline · ${queuedWrites} queued`
          : "Offline",
      tone: "text-status-warning",
    };
  }

  if (status === "saving") {
    return {
      visible: true,
      label: "Saving…",
      tone: "text-status-info",
    };
  }

  return { visible: false, label: null, tone: "" };
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
    : "Tap a marker to edit";
  const sync = syncRailSegment(syncStatus, queuedWrites, message);

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
      {timerMenuOpen ? (
        <div
          className="hud-panel pointer-events-auto absolute inset-x-3 top-[calc(100%+var(--chrome-gap-above-dock))] mx-auto max-w-xl space-y-2 p-3 pt-10"
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

      <div className="map-status-rail pointer-events-auto mx-auto flex max-w-xl items-center gap-2 rounded-[var(--radius-hud-lg)] border border-border bg-surface-panel px-2 py-1.5 shadow-[var(--shadow-hud-float)]">
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

        {sync.visible && sync.label ? (
          <>
            <div
              className="hidden h-5 w-px shrink-0 bg-border sm:block"
              aria-hidden="true"
            />
            <p
              className={`max-w-[7rem] shrink-0 truncate text-xs font-medium sm:max-w-[10rem] sm:text-sm ${sync.tone}`}
              title={sync.label}
            >
              {sync.label}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
