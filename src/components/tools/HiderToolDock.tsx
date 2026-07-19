import { ChatUnreadBadge } from "../chat/ChatUnreadBadge";
import {
  HudChatIcon,
  HudPlusIcon,
  HudRefreshIcon,
  HudSettingsIcon,
} from "../ui/HudIcons";
import { HudPinIcon } from "../map/ToolIcons";

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
  hasUnreadChat?: boolean;
  unreadCount?: number;
  /** Bottom dock (default) or vertical left rail inside DesktopOpsShell. */
  layout?: ToolDockLayout;
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
  hasUnreadChat = false,
  unreadCount = 0,
  layout = "dock",
}: HiderToolDockProps) {
  const isRail = layout === "rail";

  return (
    <div
      className={`jl-tool-dock pointer-events-auto${isRail ? " jl-tool-dock--rail" : ""}`}
    >
      <div className="jl-tool-dock-bar jl-tool-dock-group-main">
        <button
          type="button"
          onClick={onZoneAction}
          disabled={zoneDisabled}
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

        <button
          type="button"
          onClick={onOpenChat}
          className="jl-tool-slot"
          aria-label={hasUnreadChat ? "Open chat, unread messages" : "Open chat"}
        >
          <span className="jl-tool-slot-icon jl-unread-badge-host">
            <HudChatIcon className="h-5 w-5 shrink-0" />
            {hasUnreadChat ? <ChatUnreadBadge count={unreadCount} /> : null}
          </span>
          <span className="jl-tool-slot-label">Chat</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="jl-tool-slot"
          aria-label="Open settings"
        >
          <span className="jl-tool-slot-icon">
            <HudSettingsIcon className="h-5 w-5 shrink-0" />
          </span>
          <span className="jl-tool-slot-label">Setup</span>
        </button>
      </div>
    </div>
  );
}
