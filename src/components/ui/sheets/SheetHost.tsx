import { createPortal } from "react-dom";
import { useRef, type ReactNode } from "react";
import { MotionSheet } from "../../motion/MotionSheet";
import { RacMotionSheet } from "./RacMotionSheet";
import { useDialogFocus } from "@/hooks/a11y/useDialogFocus";
import { useDesktopLayout } from "@/hooks/layout/useDesktopLayout";
import { usePlayerUxWorld } from "@/hooks/feature/usePlayerUxWorld";
import {
  type ContextualRailTab,
} from "../../map/chrome/ContextualRailContext";
import { useContextualRailPanel } from "../../map/helpers/useContextualRailPanel";

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

function DesktopRailDialog({
  open,
  ariaLabel,
  railTab,
  pinned,
  children,
  panelEl,
}: {
  open: boolean;
  ariaLabel?: string;
  railTab: ContextualRailTab;
  pinned?: ReactNode;
  children: ReactNode;
  panelEl: HTMLElement;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, open);

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      data-rail-tab={railTab}
      className="contextual-rail__dialog"
    >
      {pinned}
      {children}
    </div>,
    panelEl,
  );
}

/**
 * Stable sheet host API for map chrome.
 * Desktop → ContextualRail portal (unchanged).
 * Mobile → legacy MotionSheet when flag off; RacMotionSheet when `player-ux-world-v2` on.
 */
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
  const playerUxWorld = usePlayerUxWorld();

  if (isDesktop) {
    if (!open || !railPanel?.panelEl || !railTab) {
      return null;
    }

    return (
      <DesktopRailDialog
        open={open}
        ariaLabel={ariaLabel}
        railTab={railTab}
        pinned={pinned}
        panelEl={railPanel.panelEl}
      >
        {children}
      </DesktopRailDialog>
    );
  }

  if (playerUxWorld) {
    return (
      <RacMotionSheet
        open={open}
        onClose={onClose}
        ariaLabel={ariaLabel}
        pinned={pinned}
        dismissible={dismissible}
        sheetClassName={sheetClassName}
        maxHeightClassName={maxHeightClassName}
      >
        {children}
      </RacMotionSheet>
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
