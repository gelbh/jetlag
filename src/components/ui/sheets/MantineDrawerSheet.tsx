import { Drawer } from "@mantine/core";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
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
 * `size="auto"` + maxHeight on content so consumer maxHeightClassName is not
 * clamped to Mantine's default fixed drawer height (~440px).
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
      size="auto"
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
        content: cn("mantine-drawer-sheet", sheetClassName, maxHeightClassName),
        body: "min-h-0 overflow-y-auto",
        header: ariaLabel ? "sr-only" : undefined,
      }}
      styles={{
        content: {
          height: "auto",
          paddingBottom: "env(safe-area-inset-bottom)",
        },
      }}
    >
      <div data-testid="mantine-drawer-sheet">
        {pinned}
        {children}
      </div>
    </Drawer>
  );
}
