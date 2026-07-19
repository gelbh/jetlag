import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { MotionSheet } from "../motion/MotionSheet";
import { useDesktopLayout } from "../../hooks/useDesktopLayout";
import {
  type ContextualRailTab,
} from "../map/ContextualRailContext";
import { useContextualRailPanel } from "../map/useContextualRailPanel";

export interface SheetHostProps {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  /** Tab id when multiple overlays share the rail */
  railTab?: ContextualRailTab;
  pinned?: ReactNode;
  children: ReactNode;
  dismissible?: boolean;
  sheetClassName?: string;
  maxHeightClassName?: string;
}

export function SheetHost({
  open,
  onClose,
  ariaLabel,
  railTab,
  pinned,
  children,
  dismissible = true,
  sheetClassName,
  maxHeightClassName,
}: SheetHostProps) {
  const isDesktop = useDesktopLayout();
  const railPanel = useContextualRailPanel();

  if (isDesktop) {
    if (!open || !railPanel?.panelEl || !railTab) {
      return null;
    }

    return createPortal(
      <div
        role="dialog"
        aria-label={ariaLabel}
        data-rail-tab={railTab}
        className="contextual-rail__dialog"
      >
        {pinned}
        {children}
      </div>,
      railPanel.panelEl,
    );
  }

  return (
    <MotionSheet
      open={open}
      onClose={onClose}
      ariaLabel={ariaLabel}
      pinned={pinned}
      dismissible={dismissible}
      sheetClassName={sheetClassName}
      maxHeightClassName={maxHeightClassName}
    >
      {children}
    </MotionSheet>
  );
}
