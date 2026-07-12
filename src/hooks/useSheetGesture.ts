import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import {
  MOTION_TRANSITION_SCRIM,
  MOTION_TRANSITION_SHEET,
  SHEET_DISMISS_FRACTION,
  SHEET_VELOCITY_DISMISS_PX_MS,
} from "../domain/device/motionTokens";
import { useInteractiveDragY } from "./useInteractiveDragY";

export interface UseSheetGestureOptions {
  enabled: boolean;
  onDismiss: () => void;
  scrollRef?: RefObject<HTMLElement | null>;
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
}

export function useSheetGesture({
  enabled,
  onDismiss,
  scrollRef,
}: UseSheetGestureOptions): UseSheetGestureResult {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(320);

  const canStartDrag = useCallback(() => {
    const scrollTop = scrollRef?.current?.scrollTop ?? 0;
    return scrollTop <= 0;
  }, [scrollRef]);

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
        currentOffset > height * SHEET_DISMISS_FRACTION ||
        velocityY > SHEET_VELOCITY_DISMISS_PX_MS;

      if (shouldDismiss && enabled) {
        reset();
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
  };
}

/** Velocity helper exported for unit tests. */
export function shouldDismissSheetDrag(
  offsetY: number,
  sheetHeight: number,
  velocityY: number,
): boolean {
  return (
    offsetY > sheetHeight * SHEET_DISMISS_FRACTION ||
    velocityY > SHEET_VELOCITY_DISMISS_PX_MS
  );
}

export {
  SHEET_DISMISS_FRACTION,
  SHEET_VELOCITY_DISMISS_PX_MS,
} from "../domain/device/motionTokens";
