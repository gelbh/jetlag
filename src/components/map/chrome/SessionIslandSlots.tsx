import {
  ChatCircleIcon,
  CheckFatIcon,
  GearSixIcon,
  NotebookIcon,
  SealWarningIcon,
  StarIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { ChatUnreadBadge } from "../../chat/ChatUnreadBadge";
import { JlIcon } from "../../ui/brand/JlIcon";
import { MapChromeControl } from "./MapChromeControl";

export interface SessionIslandSlotsProps {
  /** Draw / markup control — lives on the RIGHT session dock, not bottom-middle. */
  drawSlot?: ReactNode;
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
  drawSlot,
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
    <div className="jl-tool-dock-group jl-tool-dock-group-secondary flex w-full min-w-0 flex-col justify-start gap-1">
      {onOpenSettings ? (
        <MapChromeControl
          variant="slot"
          disabled={inactive}
          onClick={onOpenSettings}
          aria-label="Open settings"
          icon={<JlIcon icon={GearSixIcon} size={20} weight="regular" />}
          label="Settings"
        />
      ) : null}

      {drawSlot}

      {onOpenChat ? (
        <MapChromeControl
          variant="slot"
          disabled={inactive}
          onClick={onOpenChat}
          aria-label={hasUnreadChat ? "Open chat, unread messages" : "Open chat"}
          iconClassName="jl-unread-badge-host relative"
          icon={
            <>
              <JlIcon icon={ChatCircleIcon} size={20} weight="regular" />
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
          icon={<JlIcon icon={NotebookIcon} size={20} weight="regular" />}
          label="Log"
        />
      ) : null}

      {onOpenReportProblem ? (
        <MapChromeControl
          variant="slot"
          disabled={inactive}
          onClick={onOpenReportProblem}
          aria-label="Report a problem"
          data-survey-priority="secondary"
          icon={<JlIcon icon={WarningCircleIcon} size={20} weight="regular" />}
          label="Report"
        />
      ) : null}

      {onOpenCodes ? (
        <MapChromeControl
          variant="slot"
          disabled={inactive}
          onClick={onOpenCodes}
          aria-label="Open role codes"
          data-survey-priority="secondary"
          icon={<JlIcon icon={StarIcon} size={20} weight="regular" />}
          label="Codes"
        />
      ) : null}

      {canRequestFoundHider && onRequestFoundHider ? (
        <MapChromeControl
          variant="slot"
          disabled={inactive}
          onClick={onRequestFoundHider}
          aria-label="Declare found hider"
          data-survey-priority="secondary"
          icon={<JlIcon icon={CheckFatIcon} size={20} weight="bold" />}
          label="Found"
        />
      ) : null}

      {canStartEndGame && onStartEndGame ? (
        <MapChromeControl
          variant="slot"
          disabled={inactive}
          onClick={onStartEndGame}
          aria-label="Declare found hiding-zone station / start end game"
          data-survey-priority="secondary"
          icon={<JlIcon icon={SealWarningIcon} size={20} weight="bold" />}
          label="Station"
        />
      ) : null}
    </div>
  );
}
