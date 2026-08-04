import { HudPlusIcon, HudRefreshIcon } from "../ui/brand/HudIcons";
import { HudPinIcon } from "../map/icons/ToolIcons";
import { MapBottomChrome } from "../map/chrome/MapBottomChrome";
import { MapChromeControl } from "../map/chrome/MapChromeControl";
import { SessionIslandSlots } from "../map/chrome/SessionIslandSlots";

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
  onOpenCodes?: () => void;
  onOpenReportProblem: () => void;
  onOpenLog?: () => void;
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
  onOpenCodes,
  onOpenReportProblem,
  onOpenLog,
  hasUnreadChat = false,
  unreadCount = 0,
  layout = "dock",
  inactive = false,
}: HiderToolDockProps) {
  const isRail = layout === "rail";

  return (
    <MapBottomChrome
      layout={isRail ? "rail" : "phone"}
      inactive={inactive}
      huntDensity="sparse"
      hunt={
        <div className="jl-tool-dock-group jl-tool-dock-group-main">
          <MapChromeControl
            variant="slot"
            onClick={onZoneAction}
            disabled={zoneDisabled || inactive}
            aria-label={zoneLabel}
            icon={<HudPinIcon className="h-5 w-5 shrink-0" />}
            label={zoneLabel}
          />

          {showExpansion ? (
            <MapChromeControl
              variant="slot"
              onClick={onExpansion}
              disabled={inactive}
              aria-label="Expansion"
              icon={<HudPlusIcon className="h-5 w-5 shrink-0" />}
              label="Expansion"
            />
          ) : null}
        </div>
      }
      session={
        <SessionIslandSlots
          onOpenChat={onOpenChat}
          onOpenLog={onOpenLog}
          onOpenReportProblem={onOpenReportProblem}
          onOpenSettings={onOpenSettings}
          onOpenCodes={onOpenCodes}
          hasUnreadChat={hasUnreadChat}
          unreadCount={unreadCount}
          inactive={inactive}
        />
      }
      mapControls={
        <div className="jl-tool-dock-group">
          <MapChromeControl
            variant="slot"
            onClick={onRecenter}
            disabled={inactive}
            aria-label="Recenter map on play area"
            icon={<HudRefreshIcon className="h-5 w-5 shrink-0" />}
            label="Recenter"
          />
        </div>
      }
    />
  );
}
