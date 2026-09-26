import { createPortal } from "react-dom";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { RadixMotionSheet } from "./RadixMotionSheet";
import { MantineDrawerSheet } from "./MantineDrawerSheet";
import { useDialogFocus } from "@/hooks/a11y/useDialogFocus";
import { useDesktopLayout } from "@/hooks/layout/useDesktopLayout";
import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
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
  /** Forwarded to Mantine Drawer when flag-on. */
  padding?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  /**
   * `host` (default): sheet scrolls children.
   * `child`: sheet locks height; child owns scroll (chat).
   */
  scrollMode?: "host" | "child";
  /** Forwarded to Mantine drawer body (e.g. keyboard inset). */
  contentStyle?: CSSProperties;
  /** Ask HUD: scrim stays visual; map taps pass through for placement. */
  mapInteractive?: boolean;
}

function DesktopRailDialog({
  open,
  ariaLabel,
  railTab,
  pinned,
  children,
  panelEl,
  scrollMode = "host",
}: {
  open: boolean;
  ariaLabel?: string;
  railTab: ContextualRailTab;
  pinned?: ReactNode;
  children: ReactNode;
  panelEl: HTMLElement;
  scrollMode?: "host" | "child";
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, open);
  const childScroll = scrollMode === "child";

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      data-rail-tab={railTab}
      className={
        childScroll
          ? "contextual-rail__dialog flex h-full min-h-0 flex-col"
          : "contextual-rail__dialog"
      }
    >
      {pinned ? <div className="shrink-0">{pinned}</div> : null}
      <div
        className={
          childScroll
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : undefined
        }
      >
        {children}
      </div>
    </div>,
    panelEl,
  );
}

/**
 * Stable sheet host API for map chrome.
 * Desktop + railTab → ContextualRail portal (unchanged under flag).
 * Flag off (non-rail) → RadixMotionSheet.
 * Flag on (non-rail) → Mantine Drawer.
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
  padding,
  scrollMode,
  contentStyle,
  mapInteractive = false,
}: SheetHostProps) {
  const isDesktop = useDesktopLayout();
  const railPanel = useContextualRailPanel();
  const mantinePlayerUi = usePlayerUiMantine();

  if (isDesktop && railTab) {
    if (!open || !railPanel?.panelEl) {
      return null;
    }

    return (
      <DesktopRailDialog
        open={open}
        ariaLabel={ariaLabel}
        railTab={railTab}
        pinned={pinned}
        panelEl={railPanel.panelEl}
        scrollMode={scrollMode}
      >
        {children}
      </DesktopRailDialog>
    );
  }

  if (mantinePlayerUi) {
    return (
      <MantineDrawerSheet
        open={open}
        onClose={onClose}
        ariaLabel={ariaLabel}
        pinned={pinned}
        dismissible={dismissible}
        sheetClassName={sheetClassName}
        maxHeightClassName={maxHeightClassName}
        padding={padding}
        scrollMode={scrollMode}
        contentStyle={contentStyle}
        mapInteractive={mapInteractive}
      >
        {children}
      </MantineDrawerSheet>
    );
  }

  return (
    <RadixMotionSheet
      open={open}
      onClose={onClose}
      ariaLabel={ariaLabel}
      pinned={pinned}
      dismissible={dismissible}
      sheetClassName={sheetClassName}
      maxHeightClassName={maxHeightClassName}
    >
      {children}
    </RadixMotionSheet>
  );
}
