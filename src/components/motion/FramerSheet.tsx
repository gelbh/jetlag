import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefCallback,
  type RefObject,
} from "react";
import {
  AnimatePresence,
  motion,
  useDragControls,
  type PanInfo,
} from "motion/react";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useMotionProfile } from "../../hooks/useMotionProfile";
import { shouldDismissSheetDrag } from "../../hooks/useSheetGesture";
import { MobileSheet } from "../ui/MobileSheet";
import type { AnimatedOverlayProps } from "../ui/AnimatedOverlay";

function mergeRefs<T>(
  ...refs: Array<RefCallback<T> | RefObject<T | null> | null | undefined>
) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) {
        continue;
      }
      if (typeof ref === "function") {
        ref(node);
      } else {
        ref.current = node;
      }
    }
  };
}

const SHEET_TRANSITION = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
};

export default function FramerSheet({
  open,
  onClose,
  children,
  pinned,
  dismissible = true,
  ariaLabel,
  sheetClassName = "",
  maxHeightClassName,
}: AnimatedOverlayProps) {
  const { animate } = useMotionProfile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [isPresent, setIsPresent] = useState(open);
  const [dragY, setDragY] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(320);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (open) {
      setIsPresent(true);
      return;
    }

    if (isPresent) {
      setIsPresent(false);
    }
  }, [open, isPresent]);

  const measureSheetHeight = useCallback(() => {
    const height = sheetRef.current?.offsetHeight;
    if (height && height > 0) {
      setSheetHeight(height);
    }
  }, []);

  const handleExitComplete = useCallback(() => {
    onClose();
  }, [onClose]);

  const requestClose = useCallback(() => {
    setIsPresent(false);
  }, []);

  const canStartDrag = useCallback(() => {
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    return scrollTop <= 0;
  }, []);

  const handleDragStart = useCallback(() => {
    measureSheetHeight();
    setIsDragging(true);
  }, [measureSheetHeight]);

  const handleDrag = useCallback((_event: Event, info: PanInfo) => {
    setDragY(Math.max(0, info.offset.y));
  }, []);

  const handleDragEnd = useCallback(
    (_event: Event, info: PanInfo) => {
      setIsDragging(false);
      const height = sheetRef.current?.offsetHeight ?? sheetHeight;
      const velocityPxMs = info.velocity.y / 1000;

      if (
        dismissible &&
        shouldDismissSheetDrag(info.offset.y, height, velocityPxMs)
      ) {
        setDragY(0);
        requestClose();
        return;
      }

      setDragY(0);
    },
    [dismissible, requestClose, sheetHeight],
  );

  const handleHandlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!dismissible || !canStartDrag()) {
        return;
      }
      measureSheetHeight();
      dragControls.start(event);
    },
    [canStartDrag, dismissible, dragControls, measureSheetHeight],
  );

  useScrollLock(isPresent);

  useEffect(() => {
    if (!isPresent) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        requestClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPresent, requestClose, dismissible]);

  const scrimOpacity =
    dragY > 0 ? Math.max(0, 1 - dragY / sheetHeight) : undefined;

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isPresent ? (
        <motion.div
          key="motion-sheet-overlay"
          className="pointer-events-auto fixed inset-0 z-[var(--z-modal)] overscroll-contain hud-scrim"
          style={scrimOpacity !== undefined ? { opacity: scrimOpacity } : undefined}
          initial={{ opacity: animate ? 0 : 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: animate ? 0 : 1 }}
          transition={SHEET_TRANSITION}
          onClick={dismissible ? requestClose : undefined}
        >
          <motion.div
            ref={mergeRefs(sheetRef)}
            drag={dismissible ? "y" : false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            dragListener={false}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            initial={{ opacity: animate ? 0.92 : 1, y: animate ? "100%" : 0 }}
            animate={{ opacity: 1, y: dragY > 0 ? dragY : 0 }}
            exit={{ opacity: animate ? 0.92 : 1, y: animate ? "100%" : 0 }}
            transition={
              isDragging ? { duration: 0 } : SHEET_TRANSITION
            }
            onClick={(event) => event.stopPropagation()}
          >
            <MobileSheet
              className={sheetClassName.trim()}
              layout={pinned ? "split" : "scroll"}
              maxHeightClassName={maxHeightClassName}
              pinned={pinned}
              scrollRef={scrollRef}
              handleProps={
                dismissible
                  ? {
                      onPointerDown: handleHandlePointerDown,
                      onPointerMove: () => {},
                      onPointerUp: () => {},
                      onPointerCancel: () => {},
                    }
                  : undefined
              }
            >
              <div role="dialog" aria-modal="true" aria-label={ariaLabel}>
                {children}
              </div>
            </MobileSheet>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
