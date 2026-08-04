import { ChatUnreadBadge } from "../../chat/ChatUnreadBadge";
import {
  HudChatIcon,
  HudGuideIcon,
  HudLeaderboardIcon,
  HudSettingsIcon,
  HudStarIcon,
} from "../../ui/brand/HudIcons";
import { MapChromeControl } from "./MapChromeControl";

export interface SessionIslandSlotsProps {
  onOpenChat?: () => void;
  onOpenLog?: () => void;
  onOpenReportProblem?: () => void;
  onOpenSettings?: () => void;
  onOpenCodes?: () => void;
  hasUnreadChat?: boolean;
  unreadCount?: number;
  inactive?: boolean;
  canStartEndGame?: boolean;
  onStartEndGame?: () => void;
  canRequestFoundHider?: boolean;
  onRequestFoundHider?: () => void;
}

export function SessionIslandSlots({
  onOpenChat,
  onOpenLog,
  onOpenReportProblem,
  onOpenSettings,
  onOpenCodes,
  hasUnreadChat = false,
  unreadCount = 0,
  inactive = false,
  canStartEndGame = false,
  onStartEndGame,
  canRequestFoundHider = false,
  onRequestFoundHider,
}: SessionIslandSlotsProps) {
  return (
    <div className="jl-tool-dock-group jl-tool-dock-group-secondary">
      {onOpenChat ? (
        <MapChromeControl
          variant="slot"
          disabled={inactive}
          onClick={onOpenChat}
          aria-label={
            hasUnreadChat ? "Open chat, unread messages" : "Open chat"
          }
          iconClassName="jl-unread-badge-host"
          icon={
            <>
              <HudChatIcon className="h-5 w-5 shrink-0" />
              {hasUnreadChat ? <ChatUnreadBadge count={unreadCount} /> : null}
            </>
          }
          label="Chat"
        />
      ) : null}

      {onOpenLog ? (
        <MapChromeControl
          variant="slot"
          disabled={inactive}
          onClick={onOpenLog}
          aria-label="Open session log"
          icon={<HudLeaderboardIcon className="h-5 w-5 shrink-0" />}
          label="Log"
        />
      ) : null}

      {onOpenReportProblem ? (
        <MapChromeControl
          variant="slot"
          disabled={inactive}
          onClick={onOpenReportProblem}
          aria-label="Report a problem"
          icon={<HudGuideIcon className="h-5 w-5 shrink-0" />}
          label="Report"
        />
      ) : null}

      {onOpenCodes ? (
        <MapChromeControl
          variant="slot"
          disabled={inactive}
          onClick={onOpenCodes}
          aria-label="Open role codes"
          icon={<HudStarIcon className="h-5 w-5 shrink-0" />}
          label="Codes"
        />
      ) : null}

      {onOpenSettings ? (
        <MapChromeControl
          variant="slot"
          disabled={inactive}
          onClick={onOpenSettings}
          aria-label="Open settings"
          icon={<HudSettingsIcon className="h-5 w-5 shrink-0" />}
          label="Settings"
        />
      ) : null}

      {canRequestFoundHider && onRequestFoundHider ? (
        <MapChromeControl
          variant="slot"
          disabled={inactive}
          onClick={onRequestFoundHider}
          aria-label="Declare found hider"
          icon={<span aria-hidden="true">✓</span>}
          label="Found"
        />
      ) : null}

      {canStartEndGame && onStartEndGame ? (
        <MapChromeControl
          variant="slot"
          disabled={inactive}
          onClick={onStartEndGame}
          aria-label="Declare found hiding-zone station / start end game"
          icon={<span aria-hidden="true">!</span>}
          label="Station"
        />
      ) : null}
    </div>
  );
}
