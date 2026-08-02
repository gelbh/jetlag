import { HudPlusIcon, HudRefreshIcon } from "../ui/brand/HudIcons";
import { HudPinIcon } from "../map/icons/ToolIcons";
import { ToolDockSecondaryBar } from "./ToolDockSecondaryBar";

import type { ToolDockLayout } from "./ToolDock";

interface HiderToolDockProps {
  zoneLabel: string;
  onZoneAction: () => void;
  zoneDisabled?: boolean;
  showExpansion: boolean;
  onExpansion: () => void;
  onRecenter: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onOpenReportProblem: () => void;
  hasUnreadChat?: boolean;
  unreadCount?: number;
  /** Bottom dock (default) or vertical left rail inside DesktopOpsShell. */
  layout?: ToolDockLayout;
  inactive?: boolean;
}

export function HiderToolDock({
  zoneLabel,
  onZoneAction,
  zoneDisabled = false,
  showExpansion,
  onExpansion,
  onRecenter,
  onOpenChat,
  onOpenSettings,
  onOpenReportProblem,
  hasUnreadChat = false,
  unreadCount = 0,
  layout = "dock",
  inactive = false,
}: HiderToolDockProps) {
  const isRail = layout === "rail";

  return (
    <div
      className={`jl-tool-dock pointer-events-auto${isRail ? " jl-tool-dock--rail" : ""}${inactive ? " pointer-events-none opacity-55 saturate-50" : ""}`}
    >
      <div className={`jl-tool-dock-bar jl-tool-dock-group-main${isRail ? " jl-scroll" : ""}`}>
        <button
          type="button"
          onClick={onZoneAction}
          disabled={zoneDisabled || inactive}
          className="jl-tool-slot"
          aria-label={zoneLabel}
        >
          <span className="jl-tool-slot-icon">
            <HudPinIcon className="h-5 w-5 shrink-0" />
          </span>
          <span className="jl-tool-slot-label">{zoneLabel}</span>
        </button>

        {showExpansion ? (
          <button
            type="button"
            onClick={onExpansion}
            className="jl-tool-slot"
            aria-label="Expansion"
          >
            <span className="jl-tool-slot-icon">
              <HudPlusIcon className="h-5 w-5 shrink-0" />
            </span>
            <span className="jl-tool-slot-label">Expansion</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={onRecenter}
          className="jl-tool-slot"
          aria-label="Recenter map on play area"
        >
          <span className="jl-tool-slot-icon">
            <HudRefreshIcon className="h-5 w-5 shrink-0" />
          </span>
          <span className="jl-tool-slot-label">Recenter</span>
        </button>
      </div>

      <ToolDockSecondaryBar
        onOpenChat={onOpenChat}
        onOpenReportProblem={onOpenReportProblem}
        onOpenSettings={onOpenSettings}
        hasUnreadChat={hasUnreadChat}
        unreadCount={unreadCount}
        inactive={inactive}
      />
    </div>
  );
}
