import {
  ChatCircleIcon,
  CheckFatIcon,
  DotsThreeIcon,
  GearSixIcon,
  NotebookIcon,
  SealWarningIcon,
  StarIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { ChatUnreadBadge } from "../../chat/ChatUnreadBadge";
import { JlIcon } from "../../ui/brand/JlIcon";
import { SheetHost } from "../../ui/sheets/SheetHost";
import { MapChromeControl } from "./MapChromeControl";

export interface SessionIslandSlotsProps {
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

      <SessionIslandMoreMenu
        inactive={inactive}
        onOpenLog={onOpenLog}
        onOpenReportProblem={onOpenReportProblem}
        onOpenCodes={onOpenCodes}
      />

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

function SessionIslandMoreMenu({
  inactive,
  onOpenLog,
  onOpenReportProblem,
  onOpenCodes,
}: {
  inactive: boolean;
  onOpenLog?: () => void;
  onOpenReportProblem?: () => void;
  onOpenCodes?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const actions = [
    onOpenLog
      ? {
          label: "Open session log",
          title: "Session log",
          icon: NotebookIcon,
          onClick: onOpenLog,
        }
      : null,
    onOpenReportProblem
      ? {
          label: "Report a problem",
          title: "Report a problem",
          icon: WarningCircleIcon,
          onClick: onOpenReportProblem,
        }
      : null,
    onOpenCodes
      ? {
          label: "Open role codes",
          title: "Role codes",
          icon: StarIcon,
          onClick: onOpenCodes,
        }
      : null,
  ].filter((action): action is NonNullable<typeof action> => action !== null);

  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      <MapChromeControl
        variant="slot"
        disabled={inactive}
        onClick={() => setOpen((value) => !value)}
        aria-label="More session tools"
        aria-expanded={open}
        aria-haspopup="menu"
        icon={<JlIcon icon={DotsThreeIcon} size={20} weight="bold" />}
        label="More"
      />
      <SheetHost
        open={open && !inactive}
        onClose={() => setOpen(false)}
        ariaLabel="More session tools"
        maxHeightClassName="max-h-[min(50dvh,24rem)]"
        pinned={
          <h2 className="text-[1.25rem] font-bold tracking-tight text-field-ink">
            More session tools
          </h2>
        }
      >
        <div className="flex flex-col gap-1" role="menu" aria-label="More session tools">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              aria-label={action.label}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
              className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-field-ink hover:bg-surface-raised/80"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised/90">
                <JlIcon icon={action.icon} size={22} weight="regular" />
              </span>
              <span className="min-w-0 flex-1 text-[0.9375rem] font-semibold tracking-tight">
                {action.title}
              </span>
            </button>
          ))}
        </div>
      </SheetHost>
    </>
  );
}
