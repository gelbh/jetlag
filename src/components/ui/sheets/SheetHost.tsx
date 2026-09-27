import type { CSSProperties, ReactNode } from "react";
import { DrawerSheet } from "./DrawerSheet";

export interface SheetHostProps {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  /** @deprecated Ignored; sheets always use DrawerSheet. */
  railTab?: string;
  pinned?: ReactNode;
  children: ReactNode;
  dismissible?: boolean;
  sheetClassName?: string;
  maxHeightClassName?: string;
  /** Forwarded to Mantine Drawer. */
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

/**
 * Stable sheet host API for map chrome.
 * Always Mantine Drawer (phone shell path).
 */
export function SheetHost({
  open,
  onClose,
  ariaLabel,
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
  return (
    <DrawerSheet
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
    </DrawerSheet>
  );
}
