import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

const DISMISS_FRACTION = 0.28;
const VELOCITY_DISMISS_PX_MS = 0.45;
const MIN_DRAG_START_PX = 6;

export interface UseSheetGestureOptions {
  enabled: boolean;
  onDismiss: () => void;
  scrollRef?: RefObject<HTMLElement | null>;
}

export interface SheetHandleProps {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
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
  const [offsetY, setOffsetY] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const dragActive = useRef(false);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocityY = useRef(0);

  const resetDrag = useCallback(() => {
    dragActive.current = false;
    setIsDragging(false);
    setOffsetY(0);
    startY.current = 0;
    startOffset.current = 0;
    velocityY.current = 0;
  }, []);

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

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }

      if (!canStartDrag()) {
        return;
      }

      measureSheetHeight();
      dragActive.current = true;
      setIsDragging(true);
      startY.current = event.clientY;
      startOffset.current = offsetY;
      lastY.current = event.clientY;
      lastTime.current = event.timeStamp;
      velocityY.current = 0;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [enabled, canStartDrag, measureSheetHeight, offsetY],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragActive.current) {
        return;
      }

      const delta = event.clientY - startY.current;
      if (delta < MIN_DRAG_START_PX && delta > 0) {
        return;
      }

      const nextOffset = Math.max(0, startOffset.current + delta);
      const dt = Math.max(1, event.timeStamp - lastTime.current);
      velocityY.current = (event.clientY - lastY.current) / dt;
      lastY.current = event.clientY;
      lastTime.current = event.timeStamp;
      setOffsetY(nextOffset);
    },
    [],
  );

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragActive.current) {
        return;
      }

      event.currentTarget.releasePointerCapture(event.pointerId);

      const sheetHeight = sheetRef.current?.offsetHeight ?? 320;
      const shouldDismiss =
        offsetY > sheetHeight * DISMISS_FRACTION ||
        velocityY.current > VELOCITY_DISMISS_PX_MS;

      if (shouldDismiss && enabled) {
        resetDrag();
        onDismiss();
        return;
      }

      dragActive.current = false;
      setIsDragging(false);
      setOffsetY(0);
    },
    [enabled, offsetY, onDismiss, resetDrag],
  );

  const sheetStyle: CSSProperties =
    offsetY > 0 || isDragging
      ? {
          transform: `translateY(${offsetY}px)`,
          transition: isDragging
            ? "none"
            : "transform var(--motion-sheet) var(--ease-spring-subtle)",
        }
      : {};

  const scrimStyle: CSSProperties =
    offsetY > 0
      ? {
          opacity: Math.max(0, 1 - offsetY / sheetHeight),
          transition: isDragging ? "none" : "opacity var(--motion-fast) var(--ease-out-quint)",
        }
      : {};

  return {
    sheetRef,
    sheetStyle,
    scrimStyle,
    handleProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
    },
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
    offsetY > sheetHeight * DISMISS_FRACTION ||
    velocityY > VELOCITY_DISMISS_PX_MS
  );
}

export const SHEET_DISMISS_FRACTION = DISMISS_FRACTION;
export const SHEET_VELOCITY_DISMISS_PX_MS = VELOCITY_DISMISS_PX_MS;
