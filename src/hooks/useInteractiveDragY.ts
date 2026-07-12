import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { MIN_DRAG_START_PX } from "../domain/device/motionTokens";

export interface PointerDragBindings {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
}

export interface UseInteractiveDragYOptions {
  enabled: boolean;
  canStart?: () => boolean;
  mapDelta: (delta: number, startOffset: number) => number;
  startOffset?: number;
  onDragEnd: (params: { offsetY: number; velocityY: number }) => void;
  minDragStartPx?: number;
}

export function useInteractiveDragY({
  enabled,
  canStart,
  mapDelta,
  startOffset = 0,
  onDragEnd,
  minDragStartPx = MIN_DRAG_START_PX,
}: UseInteractiveDragYOptions): {
  bindings: PointerDragBindings;
  isDragging: boolean;
  offsetY: number;
  velocityY: number;
  reset: () => void;
} {
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragActive = useRef(false);
  const startY = useRef(0);
  const dragStartOffset = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocityY = useRef(0);

  const reset = useCallback(() => {
    dragActive.current = false;
    setIsDragging(false);
    setOffsetY(0);
    startY.current = 0;
    dragStartOffset.current = 0;
    velocityY.current = 0;
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }

      if (canStart && !canStart()) {
        return;
      }

      dragActive.current = true;
      setIsDragging(true);
      startY.current = event.clientY;
      dragStartOffset.current = startOffset;
      lastY.current = event.clientY;
      lastTime.current = event.timeStamp;
      velocityY.current = 0;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canStart, enabled, startOffset],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragActive.current) {
        return;
      }

      const delta = event.clientY - startY.current;
      if (Math.abs(delta) < minDragStartPx) {
        return;
      }

      const nextOffset = mapDelta(delta, dragStartOffset.current);
      const dt = Math.max(1, event.timeStamp - lastTime.current);
      velocityY.current = (event.clientY - lastY.current) / dt;
      lastY.current = event.clientY;
      lastTime.current = event.timeStamp;
      setOffsetY(nextOffset);
    },
    [mapDelta, minDragStartPx],
  );

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragActive.current) {
        return;
      }

      event.currentTarget.releasePointerCapture(event.pointerId);

      const currentOffset = offsetY;
      const currentVelocity = velocityY.current;
      dragActive.current = false;
      setIsDragging(false);

      onDragEnd({ offsetY: currentOffset, velocityY: currentVelocity });
    },
    [offsetY, onDragEnd],
  );

  return {
    bindings: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
    },
    isDragging,
    offsetY,
    velocityY: velocityY.current,
    reset,
  };
}
