import { Link } from "react-router-dom";
import { SessionTimerLabel } from "../../components/session/SessionTimerLabel";
import { HudHomeIcon } from "../../components/ui/HudIcons";
import type { SessionRecord } from "../../domain/map/annotations";
import type { UseMapOverlayStateResult } from "../../hooks/map/useMapOverlayState";
import type { useSessionTimer } from "../../hooks/session/useSessionTimer";

interface ObserverMapScreenChromeProps {
  session: SessionRecord;
  timer: ReturnType<typeof useSessionTimer>;
  overlay: UseMapOverlayStateResult;
  onLeave: () => void;
}

export function ObserverMapScreenChrome({
  session,
  timer,
  overlay,
  onLeave,
}: ObserverMapScreenChromeProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[var(--z-dock)] px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto jl-status-bar mx-auto flex max-w-xl items-center justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <p className="font-mono text-sm font-bold tracking-[0.18em] text-ink">
              {session.code}
            </p>
            <p className="text-xs tabular-nums text-ink-muted">
              <SessionTimerLabel timerState={timer.timerState} />
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-brand-blue/50 bg-brand-blue/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-brand-blue">
            Observer
          </span>
          <button
            type="button"
            className="hud-chrome inline-flex min-h-11 min-w-11 items-center justify-center"
            aria-label="Leave observation"
            onClick={onLeave}
          >
            <HudHomeIcon className="size-5" />
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[var(--z-dock)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto mx-auto flex max-w-xl items-center justify-between gap-2 rounded-xl border border-border bg-surface-panel/95 p-2 shadow-hud-float backdrop-blur-sm">
          <button
            type="button"
            className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold uppercase tracking-wide ${
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
            className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold uppercase tracking-wide ${
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
          <Link
            to="/admin"
            className="btn-secondary inline-flex min-h-11 items-center px-3 text-sm"
          >
            Admin
          </Link>
        </div>
      </div>
    </>
  );
}
