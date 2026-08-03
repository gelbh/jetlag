import { ChatUnreadBadge } from "../../chat/ChatUnreadBadge";
import { MotionPressable } from "../../motion/MotionPressable";
import {
  HudChatIcon,
  HudGuideIcon,
  HudLeaderboardIcon,
  HudSettingsIcon,
  HudStarIcon,
} from "../../ui/brand/HudIcons";

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
        <MotionPressable
          type="button"
          disabled={inactive}
          onClick={onOpenChat}
          className="jl-tool-slot"
          aria-label={
            hasUnreadChat ? "Open chat, unread messages" : "Open chat"
          }
        >
          <span className="jl-tool-slot-icon jl-unread-badge-host">
            <HudChatIcon className="h-5 w-5 shrink-0" />
            {hasUnreadChat ? <ChatUnreadBadge count={unreadCount} /> : null}
          </span>
          <span className="jl-tool-slot-label">Chat</span>
        </MotionPressable>
      ) : null}

      {onOpenLog ? (
        <MotionPressable
          type="button"
          disabled={inactive}
          onClick={onOpenLog}
          className="jl-tool-slot"
          aria-label="Open session log"
        >
          <span className="jl-tool-slot-icon">
            <HudLeaderboardIcon className="h-5 w-5 shrink-0" />
          </span>
          <span className="jl-tool-slot-label">Log</span>
        </MotionPressable>
      ) : null}

      {onOpenReportProblem ? (
        <MotionPressable
          type="button"
          disabled={inactive}
          onClick={onOpenReportProblem}
          className="jl-tool-slot"
          aria-label="Report a problem"
        >
          <span className="jl-tool-slot-icon">
            <HudGuideIcon className="h-5 w-5 shrink-0" />
          </span>
          <span className="jl-tool-slot-label">Report</span>
        </MotionPressable>
      ) : null}

      {onOpenCodes ? (
        <MotionPressable
          type="button"
          disabled={inactive}
          onClick={onOpenCodes}
          className="jl-tool-slot"
          aria-label="Open role codes"
        >
          <span className="jl-tool-slot-icon">
            <HudStarIcon className="h-5 w-5 shrink-0" />
          </span>
          <span className="jl-tool-slot-label">Codes</span>
        </MotionPressable>
      ) : null}

      {onOpenSettings ? (
        <MotionPressable
          type="button"
          disabled={inactive}
          onClick={onOpenSettings}
          className="jl-tool-slot"
          aria-label="Open settings"
        >
          <span className="jl-tool-slot-icon">
            <HudSettingsIcon className="h-5 w-5 shrink-0" />
          </span>
          <span className="jl-tool-slot-label">Settings</span>
        </MotionPressable>
      ) : null}

      {canRequestFoundHider && onRequestFoundHider ? (
        <MotionPressable
          type="button"
          disabled={inactive}
          onClick={onRequestFoundHider}
          className="jl-tool-slot"
          aria-label="Declare found hider"
        >
          <span className="jl-tool-slot-icon" aria-hidden="true">
            ✓
          </span>
          <span className="jl-tool-slot-label">Found</span>
        </MotionPressable>
      ) : null}

      {canStartEndGame && onStartEndGame ? (
        <MotionPressable
          type="button"
          disabled={inactive}
          onClick={onStartEndGame}
          className="jl-tool-slot"
          aria-label="Start end game — seekers entered the hiding zone"
        >
          <span className="jl-tool-slot-icon" aria-hidden="true">
            !
          </span>
          <span className="jl-tool-slot-label">End</span>
        </MotionPressable>
      ) : null}
    </div>
  );
}
