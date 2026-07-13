import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  DEFAULT_PANEL_HEIGHT_PX,
  MIN_DRAG_START_PX,
  MOTION_TRANSITION_PANEL,
  PANEL_EXPAND_VELOCITY_PX_MS,
  PANEL_MINIMIZE_VELOCITY_PX_MS,
  PANEL_PEEK_HEIGHT_PX,
  PANEL_SNAP_FRACTION,
} from "../domain/device/motionTokens";
import {
  hasExceededDragSlop,
  useInteractiveDragY,
} from "./useInteractiveDragY";
import { useMotionProfile } from "./useMotionProfile";

export interface UsePanelDragOptions {
  userMinimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
  mapPanning?: boolean;
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
  displayMinimized: boolean;
  panelStyle: CSSProperties;
  handleProps: PanelHandleProps;
  peekHandleProps: PanelHandleProps & {
    onClick: () => void;
  };
}

/** Collapsed rest offset in px from fully expanded (0). */
export function collapsedRestOffsetPx(
  panelHeight: number,
  peekHeightPx: number,
): number {
  return Math.max(0, panelHeight - peekHeightPx);
}

/** Inline transform for a measured vertical offset. */
export function panelTransformPx(offsetPx: number): string {
  return `translateY(${offsetPx}px)`;
}

/** Whether the panel should visually show peek UI after settle completes. */
export function resolveDisplayMinimizedAfterSettle(
  targetMinimized: boolean,
): boolean {
  return targetMinimized;
}

export function usePanelDrag({
  userMinimized,
  onMinimizedChange,
  mapPanning = false,
  panelRef,
  peekHeightPx = PANEL_PEEK_HEIGHT_PX,
}: UsePanelDragOptions): UsePanelDragResult {
  const { animate } = useMotionProfile();
  const suppressPeekClick = useRef(false);
  const dragFromCollapsed = useRef(false);
  const pendingMinimizedRef = useRef<boolean | null>(null);
  const prevMapPanningRef = useRef(mapPanning);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT_PX);
  const [offsetPx, setOffsetPx] = useState(0);
  const [dragBaseOffsetPx, setDragBaseOffsetPx] = useState(0);
  const [displayMinimized, setDisplayMinimized] = useState(userMinimized);
  const [isSettling, setIsSettling] = useState(false);

  const collapsedPx = collapsedRestOffsetPx(panelHeight, peekHeightPx);

  const measurePanelHeight = useCallback(() => {
    const height = panelRef?.current?.offsetHeight;
    if (height && height > 0) {
      setPanelHeight(height);
    }
  }, [panelRef]);

  const beginSettle = useCallback(
    (targetPx: number, targetMinimized: boolean) => {
      pendingMinimizedRef.current = targetMinimized;
      setIsSettling(true);
      setOffsetPx(targetPx);
    },
    [],
  );

  const finishSettle = useCallback(() => {
    const targetMinimized = pendingMinimizedRef.current;
    pendingMinimizedRef.current = null;
    setIsSettling(false);
    if (targetMinimized === null) {
      return;
    }
    setDisplayMinimized(resolveDisplayMinimizedAfterSettle(targetMinimized));
    if (targetMinimized !== userMinimized) {
      onMinimizedChange(targetMinimized);
    }
  }, [onMinimizedChange, userMinimized]);

  const { bindings, isDragging, offsetY, reset } = useInteractiveDragY({
    enabled: animate,
    canStart: () => {
      measurePanelHeight();
      suppressPeekClick.current = false;
      dragFromCollapsed.current = displayMinimized;
      const baseOffset = displayMinimized ? collapsedPx : offsetPx;
      setDragBaseOffsetPx(baseOffset);
      return true;
    },
    mapDelta: (delta) =>
      dragFromCollapsed.current ? Math.min(0, delta) : Math.max(0, delta),
    onDragEnd: ({ offsetY: relativeOffset, velocityY }) => {
      const height = panelRef?.current?.offsetHeight ?? panelHeight;
      const collapsed = collapsedRestOffsetPx(height, peekHeightPx);
      const moved =
        hasExceededDragSlop(relativeOffset, MIN_DRAG_START_PX) ||
        Math.abs(velocityY) > 0.01;

      if (moved) {
        suppressPeekClick.current = true;
      }

      reset();

      if (!moved) {
        return;
      }

      if (dragFromCollapsed.current) {
        setDisplayMinimized(false);
        if (shouldExpandPanelSnap(relativeOffset, height, velocityY)) {
          beginSettle(0, false);
        } else {
          beginSettle(collapsed, true);
        }
        return;
      }

      if (shouldMinimizePanelSnap(relativeOffset, height, velocityY)) {
        beginSettle(collapsed, true);
      } else {
        beginSettle(0, false);
      }
    },
  });

  useEffect(() => {
    const el = panelRef?.current;
    if (!el || !isSettling) {
      return;
    }

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName !== "transform") {
        return;
      }
      finishSettle();
    };

    el.addEventListener("transitionend", handleTransitionEnd);
    return () => el.removeEventListener("transitionend", handleTransitionEnd);
  }, [finishSettle, isSettling, panelRef]);

  useEffect(() => {
    if (!animate || isDragging || isSettling) {
      return;
    }

    const panStarted = mapPanning && !prevMapPanningRef.current;
    const panEnded = !mapPanning && prevMapPanningRef.current;

    if (panStarted) {
      /* eslint-disable react-hooks/set-state-in-effect -- map-pan collapse is driven by external map gesture */
      if (userMinimized) {
        setDisplayMinimized(true);
        setOffsetPx(collapsedPx);
      } else {
        setDisplayMinimized(false);
        beginSettle(collapsedPx, true);
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    } else if (panEnded && !userMinimized) {
      beginSettle(0, false);
    }

    prevMapPanningRef.current = mapPanning;
  }, [
    animate,
    beginSettle,
    collapsedPx,
    isDragging,
    isSettling,
    mapPanning,
    userMinimized,
  ]);

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
    if (animate) {
      setDisplayMinimized(false);
      beginSettle(0, false);
      return;
    }
    onMinimizedChange(false);
  }, [animate, beginSettle, onMinimizedChange]);

  const reducedMotionMinimized = userMinimized || mapPanning;
  const effectiveDisplayMinimized = animate
    ? isDragging
      ? false
      : displayMinimized
    : reducedMotionMinimized;
  const effectiveOffsetPx = animate
    ? isDragging
      ? dragBaseOffsetPx + offsetY
      : offsetPx
    : reducedMotionMinimized
      ? collapsedPx
      : 0;

  const showTransform =
    animate &&
    (isDragging ||
      isSettling ||
      effectiveDisplayMinimized ||
      effectiveOffsetPx > 0 ||
      mapPanning);

  const transition =
    isDragging || !animate ? "none" : MOTION_TRANSITION_PANEL;

  const panelStyle: CSSProperties =
    showTransform || (!animate && reducedMotionMinimized)
      ? {
          transform: panelTransformPx(effectiveOffsetPx),
          transition,
        }
      : {};

  return {
    offsetY: effectiveOffsetPx,
    isDragging,
    displayMinimized: effectiveDisplayMinimized,
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
