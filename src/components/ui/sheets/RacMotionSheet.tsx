import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import {
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  animate as motionAnimate,
} from "motion/react";
import { useScrollLock } from "@/hooks/layout/useScrollLock";
import { useMotionProfile } from "@/hooks/motion/useMotionProfile";
import {
  SHEET_DISMISS_FRACTION,
  SHEET_VELOCITY_DISMISS_PX_MS,
} from "@/domain/device/motion/motionTokens";
import { MobileSheet } from "./MobileSheet";
import type { SheetHandleProps } from "@/hooks/motion/useSheetGesture";

export interface RacMotionSheetProps {
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
 * Survey sheet path: React Aria dialog semantics + Motion drag/spring.
 * Desktop ContextualRail stays on SheetHost; this is mobile/overlay only.
 */
export function RacMotionSheet({
  open,
  onClose,
  children,
  pinned,
  dismissible = true,
  ariaLabel,
  sheetClassName = "",
  maxHeightClassName,
}: RacMotionSheetProps) {
  const { decorativeAnimate } = useMotionProfile();
  const systemReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(systemReducedMotion) || !decorativeAnimate;
  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetMeasureRef = useRef<HTMLDivElement>(null);
  const sheetHeightRef = useRef(320);
  const y = useMotionValue(0);
  const dragControls = useDragControls();

  useScrollLock(open);

  useEffect(() => {
    if (!open) {
      y.set(0);
    }
  }, [open, y]);

  const requestClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const measureHeight = useCallback(() => {
    const height = sheetMeasureRef.current?.offsetHeight;
    if (height && height > 0) {
      sheetHeightRef.current = height;
    }
  }, []);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      // Only wired when dismissible + motion enabled (drag/handleProps gated above).
      measureHeight();
      const height = sheetHeightRef.current;
      const shouldDismiss =
        info.offset.y > height * SHEET_DISMISS_FRACTION ||
        info.velocity.y > SHEET_VELOCITY_DISMISS_PX_MS * 1000;

      if (shouldDismiss) {
        requestClose();
        y.set(0);
        return;
      }
      void motionAnimate(y, 0, { type: "spring", stiffness: 420, damping: 36 });
    },
    [measureHeight, requestClose, y],
  );

  const canStartHandleDrag = useCallback(() => {
    return (scrollRef.current?.scrollTop ?? 0) <= 0;
  }, []);

  const handleProps: SheetHandleProps | undefined =
    dismissible && !reduceMotion
      ? {
          onPointerDown: (event) => {
            if (!canStartHandleDrag()) {
              return;
            }
            measureHeight();
            dragControls.start(event);
          },
          onPointerMove: () => undefined,
          onPointerUp: () => undefined,
          onPointerCancel: () => undefined,
        }
      : undefined;

  return (
    <ModalOverlay
      isOpen={open}
      isDismissable={dismissible}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && dismissible) {
          requestClose();
        }
      }}
      className={({ isEntering, isExiting }) =>
        [
          "pointer-events-auto fixed inset-0 z-[var(--z-modal)] overscroll-contain hud-scrim",
          "jl-survey-world",
          !reduceMotion && isEntering ? "hud-scrim-enter" : "",
          !reduceMotion && isExiting ? "hud-scrim-exit" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <Modal className="pointer-events-none fixed inset-0 flex items-end justify-center outline-none">
          <Dialog
          aria-label={ariaLabel ?? "Sheet"}
          className="pointer-events-auto w-full max-w-none outline-none"
        >
          <motion.div
            ref={sheetMeasureRef}
            className="w-full"
            data-player-ux-world="survey"
            initial={reduceMotion ? false : { y: "100%" }}
            animate={{ y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 380, damping: 34 }
            }
            style={reduceMotion ? undefined : { y }}
            drag={reduceMotion || !dismissible ? false : "y"}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.45 }}
            onDragEnd={reduceMotion ? undefined : handleDragEnd}
          >
            <MobileSheet
              variant="nested"
              className={sheetClassName}
              layout={pinned ? "split" : "scroll"}
              maxHeightClassName={maxHeightClassName}
              pinned={pinned}
              scrollRef={scrollRef}
              handleProps={handleProps}
            >
              {children}
            </MobileSheet>
          </motion.div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
