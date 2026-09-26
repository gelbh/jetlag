import { Drawer } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IosDrawerGrabber } from "@/components/ui/apple/iosEntryChrome";
import { iosBottomDrawerStyles } from "@/components/ui/apple/iosEntryStyles";
import { JETLAG_MODAL_Z_INDEX } from "@/theme/mantineTheme";

export interface MantineDrawerSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  pinned?: ReactNode;
  dismissible?: boolean;
  ariaLabel?: string;
  sheetClassName?: string;
  maxHeightClassName?: string;
  /** Mantine Drawer padding; default `md`. Pass `sm`/`xs` for denser sheets. */
  padding?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  /**
   * `host` (default): one scroll region for children (session log).
   * `child`: host locks height; child owns scroll (chat tabs + list).
   */
  scrollMode?: "host" | "child";
  /** Extra styles on the inner body wrapper (e.g. keyboard inset). */
  contentStyle?: CSSProperties;
  /**
   * Ask placement: keep the dim scrim but let map taps pass through.
   * Also disables outside-click dismiss so pin taps do not close the tool.
   */
  mapInteractive?: boolean;
}

/**
 * Flag-on mobile/overlay sheet path: iOS bottom Drawer with grabber + safe-area.
 * Desktop ContextualRail stays on SheetHost; this mirrors RadixMotionSheet scope.
 */
export function MantineDrawerSheet({
  open,
  onClose,
  children,
  pinned,
  dismissible = true,
  ariaLabel,
  sheetClassName = "",
  maxHeightClassName = "max-h-[min(72dvh,640px)]",
  padding = "md",
  scrollMode = "host",
  contentStyle,
  mapInteractive = false,
}: MantineDrawerSheetProps) {
  const childScroll = scrollMode === "child";
  const baseStyles = iosBottomDrawerStyles(false);

  return (
    <Drawer
      opened={open}
      onClose={onClose}
      position="bottom"
      size="auto"
      padding={padding}
      radius={24}
      withCloseButton={false}
      closeOnClickOutside={dismissible && !mapInteractive}
      closeOnEscape={dismissible}
      lockScroll
      withinPortal
      keepMounted={false}
      zIndex={JETLAG_MODAL_Z_INDEX}
      title={ariaLabel}
      aria-label={ariaLabel}
      overlayProps={{
        backgroundOpacity: 0.4,
        blur: 3,
        ...(mapInteractive ? { style: { pointerEvents: "none" } } : {}),
      }}
      classNames={{
        content: cn(
          "mantine-drawer-sheet",
          sheetClassName,
          maxHeightClassName,
          "flex flex-col",
        ),
        body: cn(
          "min-h-0 flex flex-1 flex-col",
          childScroll ? "overflow-hidden" : "overflow-hidden",
        ),
        header: ariaLabel ? "sr-only" : undefined,
      }}
      styles={{
        ...baseStyles,
        content: {
          ...baseStyles.content,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
        body: {
          ...baseStyles.body,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <div
        data-testid="mantine-drawer-sheet"
        className="flex min-h-0 flex-1 flex-col gap-2"
        style={contentStyle}
      >
        <IosDrawerGrabber />
        {pinned ? <div className="shrink-0">{pinned}</div> : null}
        <div
          className={
            childScroll
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "jl-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
          }
        >
          {children}
        </div>
      </div>
    </Drawer>
  );
}
