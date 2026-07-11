import type { ReactNode } from "react";
import { SheetCloseButton } from "./SheetCloseButton";

interface HudDetailPanelProps {
  panelClassName: string;
  ariaLabel: string;
  leading: ReactNode;
  title: ReactNode;
  titleClassName?: string;
  onClose: () => void;
  closeLabel: string;
  body?: ReactNode;
  children?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function HudDetailPanel({
  panelClassName,
  ariaLabel,
  leading,
  title,
  titleClassName = "",
  onClose,
  closeLabel,
  body,
  children,
  actionLabel,
  onAction,
}: HudDetailPanelProps) {
  return (
    <div
      className={`${panelClassName} jl-panel-enter pointer-events-auto`}
      role="dialog"
      aria-label={ariaLabel}
    >
      <div className="jl-sync-detail-panel__row">
        {leading}
        <p className={titleClassName}>{title}</p>
        <SheetCloseButton
          onClick={onClose}
          label={closeLabel}
          variant="icon"
        />
      </div>

      {children}

      {body ? <p className="jl-sync-detail-panel__detail">{body}</p> : null}

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="btn-secondary jl-sync-detail-panel__action"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
