import { MapBottomChrome } from "../map/chrome/MapBottomChrome";
import { MapChromeControl } from "../map/chrome/MapChromeControl";
import { SessionIslandSlots } from "../map/chrome/SessionIslandSlots";
import { HudPinIcon, HudZoneIcon } from "../map/icons/ToolIcons";
import { HudLayersIcon, HudPlusIcon } from "../ui/brand/HudIcons";
import { ToolDeckGroup } from "./ToolDeck";

interface HiderToolDockProps {
  zoneLabel: string;
  onZoneAction: () => void;
  zoneDisabled?: boolean;
  handLabel?: string;
  onOpenHand?: () => void;
  handDisabled?: boolean;
  showExpansion: boolean;
  onExpansion: () => void;
  onAddPin?: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onOpenCodes?: () => void;
  onOpenReportProblem: () => void;
  onOpenLog?: () => void;
  hasUnreadChat?: boolean;
  unreadCount?: number;
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
  onAddPin,
  onOpenChat,
  onOpenSettings,
  onOpenCodes,
  onOpenReportProblem,
  onOpenLog,
  hasUnreadChat = false,
  unreadCount = 0,
  inactive = false,
}: HiderToolDockProps) {
  return (
    <MapBottomChrome
      inactive={inactive}
      huntDensity="sparse"
      hunt={
        <ToolDeckGroup density="sparse" aria-label="Hider map actions">
          <MapChromeControl
            variant="slot"
            onClick={onZoneAction}
            disabled={zoneDisabled || inactive}
            aria-label={zoneLabel}
            icon={<HudZoneIcon className="h-5 w-5 shrink-0" />}
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

          {onAddPin ? (
            <MapChromeControl
              variant="slot"
              onClick={onAddPin}
              disabled={inactive}
              aria-label="Add pin"
              icon={<HudPinIcon className="h-5 w-5 shrink-0" />}
              label="Add pin"
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
