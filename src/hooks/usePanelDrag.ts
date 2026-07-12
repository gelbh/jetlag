import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { useMotionProfile } from "./useMotionProfile";

const SNAP_FRACTION = 0.28;
const MINIMIZE_VELOCITY_PX_MS = 0.35;
const EXPAND_VELOCITY_PX_MS = 0.35;
const MIN_DRAG_START_PX = 6;
const PANEL_PEEK_HEIGHT_PX = 44;
const DEFAULT_PANEL_HEIGHT_PX = 320;

export interface UsePanelDragOptions {
  minimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
  panelRef?: RefObject<HTMLElement | null>;
  peekHeightPx?: number;
}

export interface PanelHandleProps {
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

export interface UsePanelDragResult {
  offsetY: number;
  isDragging: boolean;
  panelStyle: CSSProperties;
  handleProps: PanelHandleProps;
  peekHandleProps: PanelHandleProps & {
    onClick: () => void;
  };
}

export function usePanelDrag({
  minimized,
  onMinimizedChange,
  panelRef,
  peekHeightPx = PANEL_PEEK_HEIGHT_PX,
}: UsePanelDragOptions): UsePanelDragResult {
  const { animate } = useMotionProfile();
  const dragActive = useRef(false);
  const suppressPeekClick = useRef(false);
  const startY = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocityY = useRef(0);
  const [offsetY, setOffsetY] = useState(0);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT_PX);
  const [isDragging, setIsDragging] = useState(false);

  const measurePanelHeight = useCallback(() => {
    const height = panelRef?.current?.offsetHeight;
    if (height && height > 0) {
      setPanelHeight(height);
    }
  }, [panelRef]);

  const resetDrag = useCallback(() => {
    dragActive.current = false;
    setIsDragging(false);
    setOffsetY(0);
    velocityY.current = 0;
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!animate) {
        return;
      }

      measurePanelHeight();
      dragActive.current = true;
      suppressPeekClick.current = false;
      setIsDragging(true);
      startY.current = event.clientY;
      lastY.current = event.clientY;
      lastTime.current = event.timeStamp;
      velocityY.current = 0;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [animate, measurePanelHeight],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!dragActive.current) {
        return;
      }

      const delta = event.clientY - startY.current;
      if (Math.abs(delta) >= MIN_DRAG_START_PX) {
        suppressPeekClick.current = true;
      }

      const nextOffset = minimized
        ? Math.min(0, delta)
        : Math.max(0, delta);
      const dt = Math.max(1, event.timeStamp - lastTime.current);
      velocityY.current = (event.clientY - lastY.current) / dt;
      lastY.current = event.clientY;
      lastTime.current = event.timeStamp;
      setOffsetY(nextOffset);
    },
    [minimized],
  );

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!dragActive.current) {
        return;
      }

      event.currentTarget.releasePointerCapture(event.pointerId);

      const height = panelRef?.current?.offsetHeight ?? panelHeight;
      const moved = suppressPeekClick.current;
      const currentOffset = offsetY;
      const currentVelocity = velocityY.current;

      resetDrag();

      if (!moved) {
        return;
      }

      if (minimized) {
        if (shouldExpandPanelSnap(currentOffset, height, currentVelocity)) {
          onMinimizedChange(false);
        }
        return;
      }

      if (shouldMinimizePanelSnap(currentOffset, height, currentVelocity)) {
        onMinimizedChange(true);
      }
    },
    [
      minimized,
      offsetY,
      onMinimizedChange,
      panelHeight,
      panelRef,
      resetDrag,
    ],
  );

  const handlePeekClick = useCallback(() => {
    if (suppressPeekClick.current) {
      suppressPeekClick.current = false;
      return;
    }
    onMinimizedChange(false);
  }, [onMinimizedChange]);

  const transition = isDragging
    ? "none"
    : "transform var(--motion-base) var(--ease-spring-subtle)";

  let panelStyle: CSSProperties = {};
  if (!minimized && offsetY > 0) {
    panelStyle = {
      transform: `translateY(${offsetY}px)`,
      transition,
    };
  } else if (minimized && offsetY < 0) {
    panelStyle = {
      transform: `translateY(calc(100% - ${peekHeightPx}px + ${offsetY}px))`,
      transition,
    };
  }

  const handleProps: PanelHandleProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: finishDrag,
    onPointerCancel: finishDrag,
  };

  return {
    offsetY,
    isDragging,
    panelStyle,
    handleProps,
    peekHandleProps: {
      ...handleProps,
      onClick: handlePeekClick,
    },
  };
}

/** Exported for unit tests. */
export function shouldMinimizePanelSnap(
  offsetY: number,
  panelHeight: number,
  velocityY: number,
): boolean {
  return (
    offsetY >= panelHeight * SNAP_FRACTION ||
    velocityY > MINIMIZE_VELOCITY_PX_MS
  );
}

/** Exported for unit tests. */
export function shouldExpandPanelSnap(
  offsetY: number,
  panelHeight: number,
  velocityY: number,
): boolean {
  return (
    -offsetY >= panelHeight * SNAP_FRACTION ||
    velocityY < -EXPAND_VELOCITY_PX_MS
  );
}

/** @deprecated Use shouldMinimizePanelSnap */
export function shouldMinimizePanelDrag(
  offsetY: number,
  velocityY: number,
): boolean {
  return shouldMinimizePanelSnap(offsetY, DEFAULT_PANEL_HEIGHT_PX, velocityY);
}

export const PANEL_SNAP_FRACTION = SNAP_FRACTION;
export const PANEL_MINIMIZE_VELOCITY_PX_MS = MINIMIZE_VELOCITY_PX_MS;
export const PANEL_EXPAND_VELOCITY_PX_MS = EXPAND_VELOCITY_PX_MS;
export const PANEL_PEEK_HEIGHT_PX_EXPORT = PANEL_PEEK_HEIGHT_PX;

/** @deprecated Use PANEL_SNAP_FRACTION with measured height */
export const PANEL_MINIMIZE_DRAG_THRESHOLD_PX = 72;
