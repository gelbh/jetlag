import { ChatUnreadBadge } from "../chat/ChatUnreadBadge";
import { MotionPressable } from "../motion/MotionPressable";
import {
  HudChatIcon,
  HudGuideIcon,
  HudSettingsIcon,
} from "../ui/brand/HudIcons";

export interface ToolDockSecondaryBarProps {
  onOpenChat?: () => void;
  onOpenReportProblem: () => void;
  onOpenSettings: () => void;
  hasUnreadChat?: boolean;
  unreadCount?: number;
  inactive?: boolean;
}

export function ToolDockSecondaryBar({
  onOpenChat,
  onOpenReportProblem,
  onOpenSettings,
  hasUnreadChat = false,
  unreadCount = 0,
  inactive = false,
}: ToolDockSecondaryBarProps) {
  return (
    <div
      role="group"
      className="jl-tool-dock-bar jl-tool-dock-bar--secondary"
      aria-label="Session tools"
    >
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
      </div>
    </div>
  );
}
