import { Drawer } from "@mantine/core";
import type { ReactNode } from "react";
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
}

/**
 * Flag-on mobile/overlay sheet path: bottom Drawer with safe-area padding.
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
}: MantineDrawerSheetProps) {
  return (
    <Drawer
      opened={open}
      onClose={onClose}
      position="bottom"
      withCloseButton={false}
      closeOnClickOutside={dismissible}
      closeOnEscape={dismissible}
      lockScroll
      withinPortal
      keepMounted={false}
      zIndex={JETLAG_MODAL_Z_INDEX}
      title={ariaLabel}
      aria-label={ariaLabel}
      classNames={{
        content: ["mantine-drawer-sheet", sheetClassName].filter(Boolean).join(" "),
        body: maxHeightClassName,
      }}
      styles={{
        content: {
          paddingBottom: "env(safe-area-inset-bottom)",
        },
        header: ariaLabel
          ? {
              // Title is for a11y naming; hide chrome when close button is off.
              position: "absolute",
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: "hidden",
              clip: "rect(0, 0, 0, 0)",
              whiteSpace: "nowrap",
              border: 0,
            }
          : undefined,
      }}
    >
      <div data-testid="mantine-drawer-sheet">
        {pinned}
        {children}
      </div>
    </Drawer>
  );
}
