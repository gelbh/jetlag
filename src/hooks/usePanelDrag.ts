import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  DEFAULT_PANEL_HEIGHT_PX,
  MOTION_TRANSITION_BASE,
  PANEL_EXPAND_VELOCITY_PX_MS,
  PANEL_MINIMIZE_VELOCITY_PX_MS,
  PANEL_PEEK_HEIGHT_PX,
  PANEL_SNAP_FRACTION,
} from "../domain/device/motionTokens";
import { useInteractiveDragY } from "./useInteractiveDragY";
import { useMotionProfile } from "./useMotionProfile";

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
  const suppressPeekClick = useRef(false);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT_PX);

  const measurePanelHeight = useCallback(() => {
    const height = panelRef?.current?.offsetHeight;
    if (height && height > 0) {
      setPanelHeight(height);
    }
  }, [panelRef]);

  const { bindings, isDragging, offsetY, reset } = useInteractiveDragY({
    enabled: animate,
    canStart: () => {
      measurePanelHeight();
      suppressPeekClick.current = false;
      return true;
    },
    mapDelta: (delta) => (minimized ? Math.min(0, delta) : Math.max(0, delta)),
    onDragEnd: ({ offsetY: currentOffset, velocityY }) => {
      const height = panelRef?.current?.offsetHeight ?? panelHeight;
      const moved =
        currentOffset !== 0 || Math.abs(velocityY) > 0.01;
      if (moved) {
        suppressPeekClick.current = true;
      }
      reset();

      if (!moved) {
        return;
      }

      if (minimized) {
        if (shouldExpandPanelSnap(currentOffset, height, velocityY)) {
          onMinimizedChange(false);
        }
        return;
      }

      if (shouldMinimizePanelSnap(currentOffset, height, velocityY)) {
        onMinimizedChange(true);
      }
    },
  });

  const wrappedBindings: PanelHandleProps = {
    onPointerDown: bindings.onPointerDown,
    onPointerMove: bindings.onPointerMove,
    onPointerUp: bindings.onPointerUp,
    onPointerCancel: bindings.onPointerCancel,
  };

  const handlePeekClick = useCallback(() => {
    if (suppressPeekClick.current) {
      suppressPeekClick.current = false;
      return;
    }
    onMinimizedChange(false);
  }, [onMinimizedChange]);

  const transition = isDragging ? "none" : MOTION_TRANSITION_BASE;

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

  return {
    offsetY,
    isDragging,
    panelStyle,
    handleProps: wrappedBindings,
    peekHandleProps: {
      ...wrappedBindings,
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
    offsetY >= panelHeight * PANEL_SNAP_FRACTION ||
    velocityY > PANEL_MINIMIZE_VELOCITY_PX_MS
  );
}

/** Exported for unit tests. */
export function shouldExpandPanelSnap(
  offsetY: number,
  panelHeight: number,
  velocityY: number,
): boolean {
  return (
    -offsetY >= panelHeight * PANEL_SNAP_FRACTION ||
    velocityY < -PANEL_EXPAND_VELOCITY_PX_MS
  );
}

/** @deprecated Use shouldMinimizePanelSnap */
export function shouldMinimizePanelDrag(
  offsetY: number,
  velocityY: number,
): boolean {
  return shouldMinimizePanelSnap(offsetY, DEFAULT_PANEL_HEIGHT_PX, velocityY);
}

export {
  PANEL_EXPAND_VELOCITY_PX_MS,
  PANEL_MINIMIZE_VELOCITY_PX_MS,
  PANEL_PEEK_HEIGHT_PX,
  PANEL_SNAP_FRACTION,
} from "../domain/device/motionTokens";

/** @deprecated Use PANEL_PEEK_HEIGHT_PX */
export const PANEL_PEEK_HEIGHT_PX_EXPORT = PANEL_PEEK_HEIGHT_PX;

/** @deprecated Use PANEL_SNAP_FRACTION with measured height */
export const PANEL_MINIMIZE_DRAG_THRESHOLD_PX = 72;
