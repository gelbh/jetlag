import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useMotionProfile } from "./useMotionProfile";

const MINIMIZE_DRAG_THRESHOLD_PX = 72;
const MINIMIZE_VELOCITY_PX_MS = 0.35;

export interface UsePanelDragOptions {
  minimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
}

export interface PanelHandleProps {
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

export interface UsePanelDragResult {
  dragOffsetY: number;
  isDragging: boolean;
  panelStyle: CSSProperties;
  handleProps: PanelHandleProps;
}

export function usePanelDrag({
  minimized,
  onMinimizedChange,
}: UsePanelDragOptions): UsePanelDragResult {
  const { animate } = useMotionProfile();
  const dragActive = useRef(false);
  const startY = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocityY = useRef(0);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const resetDrag = useCallback(() => {
    dragActive.current = false;
    setIsDragging(false);
    setDragOffsetY(0);
    velocityY.current = 0;
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!animate || minimized) {
        return;
      }

      dragActive.current = true;
      setIsDragging(true);
      startY.current = event.clientY;
      lastY.current = event.clientY;
      lastTime.current = event.timeStamp;
      velocityY.current = 0;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [animate, minimized],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!dragActive.current) {
        return;
      }

      const delta = Math.max(0, event.clientY - startY.current);
      const dt = Math.max(1, event.timeStamp - lastTime.current);
      velocityY.current = (event.clientY - lastY.current) / dt;
      lastY.current = event.clientY;
      lastTime.current = event.timeStamp;
      setDragOffsetY(delta);
    },
    [],
  );

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!dragActive.current) {
        return;
      }

      event.currentTarget.releasePointerCapture(event.pointerId);

      const shouldMinimize =
        dragOffsetY >= MINIMIZE_DRAG_THRESHOLD_PX ||
        velocityY.current > MINIMIZE_VELOCITY_PX_MS;

      resetDrag();
      if (shouldMinimize) {
        onMinimizedChange(true);
      }
    },
    [dragOffsetY, onMinimizedChange, resetDrag],
  );

  const panelStyle: CSSProperties =
    dragOffsetY > 0 && !minimized
      ? {
          transform: `translateY(${dragOffsetY}px)`,
          transition: isDragging
            ? "none"
            : "transform var(--motion-base) var(--ease-spring-subtle)",
        }
      : {};

  return {
    dragOffsetY,
    isDragging,
    panelStyle,
    handleProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
    },
  };
}

/** Exported for unit tests. */
export function shouldMinimizePanelDrag(
  offsetY: number,
  velocityY: number,
): boolean {
  return (
    offsetY >= MINIMIZE_DRAG_THRESHOLD_PX ||
    velocityY > MINIMIZE_VELOCITY_PX_MS
  );
}

export const PANEL_MINIMIZE_DRAG_THRESHOLD_PX = MINIMIZE_DRAG_THRESHOLD_PX;
export const PANEL_MINIMIZE_VELOCITY_PX_MS = MINIMIZE_VELOCITY_PX_MS;
