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
  /**
   * Horizontal inset on DrawerSheet scroll/pinned body (see DrawerSheet.padding).
   * Numeric values floor at 10px.
   */
  padding?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  /**
   * `host` (default): sheet scrolls children.
   * `child`: sheet locks height; child owns scroll (chat).
   */
  scrollMode?: "host" | "child";
  /**
   * Passed to DrawerSheet. `paddingBottom` is keyboard/custom bottom inset on
   * the scroll body (replaces safe-area); other keys style the gesture wrapper.
   */
  contentStyle?: CSSProperties;
  /** Ask HUD: scrim stays visual; map taps pass through for placement. */
  mapInteractive?: boolean;
}

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
