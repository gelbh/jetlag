import { type CSSProperties, type RefObject, useCallback, useRef, useState } from "react";
import {
  MOTION_TRANSITION_SCRIM,
  MOTION_TRANSITION_SHEET,
  SHEET_DISMISS_FRACTION,
  SHEET_VELOCITY_DISMISS_PX_MS,
} from "../../domain/device/motion/motionTokens";
import { useInteractiveDragY } from "./useInteractiveDragY";

export interface UseSheetGestureOptions {
  enabled: boolean;
  onDismiss: () => void;
  scrollRef?: RefObject<HTMLElement | null>;
  /**
   * When true (default), pointer starts only if scrollRef.scrollTop <= 0.
   * Set false when handleProps are only on a grabber outside the scroll body
   * so a scrolled sheet still dismisses from the grabber.
   */
  gateStartOnScrollTop?: boolean;
}

export interface SheetHandleProps {
  onPointerDown: ReturnType<typeof useInteractiveDragY>["bindings"]["onPointerDown"];
  onPointerMove: ReturnType<typeof useInteractiveDragY>["bindings"]["onPointerMove"];
  onPointerUp: ReturnType<typeof useInteractiveDragY>["bindings"]["onPointerUp"];
  onPointerCancel: ReturnType<typeof useInteractiveDragY>["bindings"]["onPointerCancel"];
}

export interface UseSheetGestureResult {
  sheetRef: RefObject<HTMLDivElement | null>;
  sheetStyle: CSSProperties;
  scrimStyle: CSSProperties;
  handleProps: SheetHandleProps;
  isDragging: boolean;
  /** Clear drag translate (call when the sheet reopens after a kept-mounted dismiss). */
  reset: () => void;
}

export function useSheetGesture({
  enabled,
  onDismiss,
  scrollRef,
  gateStartOnScrollTop = true,
}: UseSheetGestureOptions): UseSheetGestureResult {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(320);

  const canStartDrag = useCallback(() => {
    if (!gateStartOnScrollTop) {
      return true;
    }
    const scrollTop = scrollRef?.current?.scrollTop ?? 0;
    return scrollTop <= 0;
  }, [gateStartOnScrollTop, scrollRef]);

  const measureSheetHeight = useCallback(() => {
    const height = sheetRef.current?.offsetHeight;
    if (height && height > 0) {
      setSheetHeight(height);
    }
  }, []);

  const { bindings, isDragging, offsetY, reset } = useInteractiveDragY({
    enabled,
    canStart: () => {
      measureSheetHeight();
      return canStartDrag();
    },
    mapDelta: (delta) => Math.max(0, delta),
    onDragEnd: ({ offsetY: currentOffset, velocityY }) => {
      const height = sheetRef.current?.offsetHeight ?? sheetHeight;
      const shouldDismiss =
        currentOffset > height * SHEET_DISMISS_FRACTION || velocityY > SHEET_VELOCITY_DISMISS_PX_MS;

      if (shouldDismiss && enabled) {
        // Keep translate until unmount so Mantine exit does not snap home first.
        onDismiss();
        return;
      }

      reset();
    },
  });

  const sheetStyle: CSSProperties =
    offsetY > 0 || isDragging
      ? {
          transform: `translateY(${offsetY}px)`,
          transition: isDragging ? "none" : MOTION_TRANSITION_SHEET,
        }
      : {};

  const scrimStyle: CSSProperties =
    offsetY > 0
      ? {
          opacity: Math.max(0, 1 - offsetY / sheetHeight),
          transition: isDragging ? "none" : MOTION_TRANSITION_SCRIM,
        }
      : {};

  return {
    sheetRef,
    sheetStyle,
    scrimStyle,
    handleProps: bindings,
    isDragging,
    reset,
  };
}

/** Velocity helper exported for unit tests. */
export function shouldDismissSheetDrag(
  offsetY: number,
  sheetHeight: number,
  velocityY: number,
): boolean {
  return offsetY > sheetHeight * SHEET_DISMISS_FRACTION || velocityY > SHEET_VELOCITY_DISMISS_PX_MS;
}

export {
  SHEET_DISMISS_FRACTION,
  SHEET_VELOCITY_DISMISS_PX_MS,
} from "../../domain/device/motion/motionTokens";
