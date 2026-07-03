import { Link } from "react-router-dom";
import { mapToolPlacingLabel } from "../../domain/mapTools";
import type { SyncStatus } from "../../domain/sync";
import type { MapTool } from "../../state/sessionStore";
import { HudHomeIcon } from "../ui/HudIcons";

interface MapStatusRailProps {
  sessionCode: string;
  activeTool: MapTool;
  syncStatus: SyncStatus;
  queuedWrites: number;
  message?: string | null;
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
}: MapStatusRailProps) {
  const placing = activeTool !== "none";
  const modeLabel = placing
    ? `Placing ${mapToolPlacingLabel(activeTool)}`
    : "Tap a marker to edit";
  const sync = syncRailSegment(syncStatus, queuedWrites, message);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[var(--z-banner)] px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
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
