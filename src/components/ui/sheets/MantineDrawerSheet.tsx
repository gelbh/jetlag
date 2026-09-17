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
  /** Extra styles on the inner body wrapper (e.g. keyboard inset). */
  contentStyle?: CSSProperties;
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
  contentStyle,
}: MantineDrawerSheetProps) {
  return (
    <Drawer
      opened={open}
      onClose={onClose}
      position="bottom"
      size="auto"
      padding="md"
      radius={24}
      withCloseButton={false}
      closeOnClickOutside={dismissible}
      closeOnEscape={dismissible}
      lockScroll
      withinPortal
      keepMounted={false}
      zIndex={JETLAG_MODAL_Z_INDEX}
      title={ariaLabel}
      aria-label={ariaLabel}
      overlayProps={{ backgroundOpacity: 0.4, blur: 3 }}
      classNames={{
        content: cn("mantine-drawer-sheet", sheetClassName, maxHeightClassName),
        body: "min-h-0 overflow-y-auto",
        header: ariaLabel ? "sr-only" : undefined,
      }}
      styles={iosBottomDrawerStyles(false)}
    >
      <div
        data-testid="mantine-drawer-sheet"
        className="flex flex-col gap-3"
        style={contentStyle}
      >
        <IosDrawerGrabber />
        {pinned}
        {children}
      </div>
    </Drawer>
  );
}
