import { HudLayersIcon, HudPlusIcon } from "../ui/brand/HudIcons";
import { HudPinIcon } from "../map/icons/ToolIcons";
import { MapBottomChrome } from "../map/chrome/MapBottomChrome";
import { MapChromeControl } from "../map/chrome/MapChromeControl";
import { SessionIslandSlots } from "../map/chrome/SessionIslandSlots";
import { ToolDeckGroup } from "./ToolDeck";

import type { ToolDockLayout } from "./ToolDock";

interface HiderToolDockProps {
  zoneLabel: string;
  onZoneAction: () => void;
  zoneDisabled?: boolean;
  /** Board hand control placed next to Set zone when economy is on. */
  handLabel?: string;
  onOpenHand?: () => void;
  handDisabled?: boolean;
  showExpansion: boolean;
  onExpansion: () => void;
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
  handLabel,
  onOpenHand,
  handDisabled = false,
  showExpansion,
  onExpansion,
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
        <ToolDeckGroup density="sparse" aria-label="Hider map actions">
          <MapChromeControl
            variant="slot"
            onClick={onZoneAction}
            disabled={zoneDisabled || inactive}
            aria-label={zoneLabel}
            icon={<HudPinIcon className="h-5 w-5 shrink-0" />}
            label={zoneLabel}
          />

          {handLabel && onOpenHand ? (
            <MapChromeControl
              variant="slot"
              onClick={onOpenHand}
              disabled={handDisabled || inactive}
              aria-label={handLabel}
              icon={<HudLayersIcon className="h-5 w-5 shrink-0" />}
              label={handLabel}
            />
          ) : null}

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
        </ToolDeckGroup>
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
    />
  );
}
