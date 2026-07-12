import { SessionTimerLabel } from "../../components/session/SessionTimerLabel";
import { SyncStatusBeacon } from "../../components/session/SyncStatusDot";
import { syncBeaconAriaLabel } from "../../components/session/status/syncRailDisplay";
import { SegmentControl } from "../../components/ui/SegmentControl";
import { HudHomeIcon } from "../../components/ui/HudIcons";
import {
  OBSERVER_PERSPECTIVE_OPTIONS,
  type ObserverPerspective,
} from "../../domain/session/observerPerspective";
import { playerRoleLabel } from "../../domain/session/playerRole";
import type { PlayerRole } from "../../domain/session/playerRole";
import type { SessionRecord } from "../../domain/map/annotations";
import type { SyncStatus } from "../../domain/device/sync";
import type { UseMapOverlayStateResult } from "../../hooks/map/useMapOverlayState";
import type { useSessionTimer } from "../../hooks/session/useSessionTimer";

interface AdminMapScreenChromeProps {
  session: SessionRecord;
  myRole: PlayerRole;
  timer: ReturnType<typeof useSessionTimer>;
  overlay: UseMapOverlayStateResult;
  perspective: ObserverPerspective;
  onPerspectiveChange: (perspective: ObserverPerspective) => void;
  onLeave: () => void;
  isWide: boolean;
  syncStatus: SyncStatus;
  moderationBusy: boolean;
  moderationError: string | null;
  onModerationAction: (action: "end" | "resetBoard" | "cleanupCode") => void;
  onToggleDiagnostics?: () => void;
  diagnosticsOpen?: boolean;
}

export function AdminMapScreenChrome({
  session,
  myRole,
  timer,
  overlay,
  perspective,
  onPerspectiveChange,
  onLeave,
  isWide,
  syncStatus,
  moderationBusy,
  moderationError,
  onModerationAction,
  onToggleDiagnostics,
  diagnosticsOpen = false,
}: AdminMapScreenChromeProps) {
  const roleLabel = playerRoleLabel(myRole);

  if (isWide) {
    return (
      <header className="admin-map-shell__top pointer-events-none px-0 pt-0">
        <div className="admin-status-bar pointer-events-auto">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-bold tracking-[0.18em] text-ink">
              {session.code}
            </p>
            <p className="text-[0.6875rem] tabular-nums text-ink-muted">
              <SessionTimerLabel timerState={timer.timerState} />
            </p>
          </div>

          <span
            className="shrink-0 rounded-md border border-brand-blue/50 bg-brand-blue/10 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-blue"
          >
            {roleLabel}
          </span>

          <div className="hidden min-w-[10rem] flex-1 sm:block">
            <SegmentControl
              value={perspective}
              options={OBSERVER_PERSPECTIVE_OPTIONS}
              onChange={onPerspectiveChange}
              aria-label="Spectator perspective"
              variant="pill"
            />
          </div>

          <span
            className="inline-flex shrink-0 items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-muted"
            aria-label={syncBeaconAriaLabel(syncStatus)}
          >
            <SyncStatusBeacon status={syncStatus} size="sm" />
            Sync
          </span>

          <button
            type="button"
            className="hud-chrome inline-flex min-h-9 min-w-9 items-center justify-center"
            aria-label="Leave admin monitor"
            onClick={onLeave}
          >
            <HudHomeIcon className="size-4" />
          </button>
        </div>
      </header>
    );
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[var(--z-dock)] px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto jl-status-bar mx-auto flex max-w-xl items-center justify-between gap-2 px-2.5 py-1.5">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold tracking-[0.18em] text-ink">
              {session.code}
            </p>
            <p className="text-[0.6875rem] tabular-nums text-ink-muted">
              <SessionTimerLabel timerState={timer.timerState} />
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-brand-blue/50 bg-brand-blue/10 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-blue">
            {roleLabel}
          </span>
          <button
            type="button"
            className="hud-chrome inline-flex min-h-9 min-w-9 items-center justify-center"
            aria-label="Leave admin monitor"
            onClick={onLeave}
          >
            <HudHomeIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[calc(4.75rem+env(safe-area-inset-top))] z-[var(--z-dock)] px-3">
        <div className="pointer-events-auto mx-auto flex max-w-xl flex-col gap-2">
          <div className="rounded-xl border border-border bg-surface-panel/95 p-2 shadow-hud-float backdrop-blur-sm">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary min-h-9 flex-1 px-2.5 text-xs"
                disabled={moderationBusy}
                onClick={() => onModerationAction("end")}
              >
                Force end
              </button>
              <button
                type="button"
                className="btn-secondary min-h-9 flex-1 px-2.5 text-xs"
                disabled={moderationBusy}
                onClick={() => onModerationAction("resetBoard")}
              >
                Reset board
              </button>
              <button
                type="button"
                className="btn-secondary min-h-9 flex-1 px-2.5 text-xs text-error"
                disabled={moderationBusy}
                onClick={() => onModerationAction("cleanupCode")}
              >
                Cleanup code
              </button>
              {onToggleDiagnostics ? (
                <button
                  type="button"
                  className={`min-h-9 flex-1 rounded-lg px-2.5 text-xs font-semibold uppercase tracking-wide ${
                    diagnosticsOpen
                      ? "bg-action text-action-ink"
                      : "bg-surface-raised text-ink"
                  }`}
                  onClick={onToggleDiagnostics}
                >
                  Diagnostics
                </button>
              ) : null}
            </div>
            {moderationError ? (
              <p className="mt-2 text-xs text-error" role="alert">
                {moderationError}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[var(--z-dock)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto mx-auto flex max-w-xl flex-col gap-2">
          <div className="rounded-xl border border-border bg-surface-panel/95 p-2 shadow-hud-float backdrop-blur-sm">
            <SegmentControl
              value={perspective}
              options={OBSERVER_PERSPECTIVE_OPTIONS}
              onChange={onPerspectiveChange}
              aria-label="Spectator perspective"
              variant="pill"
            />
          </div>
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-panel/95 p-2 shadow-hud-float backdrop-blur-sm">
            <button
              type="button"
              className={`min-h-9 flex-1 rounded-lg px-2.5 text-xs font-semibold uppercase tracking-wide ${
                overlay.isLogOpen
                  ? "bg-action text-action-ink"
                  : "bg-surface-raised text-ink"
              }`}
              onClick={() =>
                overlay.isLogOpen ? overlay.closeSheet() : overlay.openLog()
              }
            >
              Log
            </button>
            <button
              type="button"
              className={`min-h-9 flex-1 rounded-lg px-2.5 text-xs font-semibold uppercase tracking-wide ${
                overlay.isChatOpen
                  ? "bg-action text-action-ink"
                  : "bg-surface-raised text-ink"
              }`}
              onClick={() =>
                overlay.isChatOpen ? overlay.closeSheet() : overlay.openChat()
              }
            >
              Chat
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
