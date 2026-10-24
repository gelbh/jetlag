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
  padding?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  scrollMode?: "host" | "child";
  contentStyle?: CSSProperties;
  mapInteractive?: boolean;
  onExitTransitionEnd?: () => void;
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
  onExitTransitionEnd,
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
      onExitTransitionEnd={onExitTransitionEnd}
    >
      {children}
    </DrawerSheet>
  );
}
