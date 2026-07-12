import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { useMotionProfile } from "./useMotionProfile";

const AXIS_SLOP_PX = 8;
const COMMIT_FRACTION = 0.35;
const COMMIT_VELOCITY_PX_MS = 0.35;
const RUBBER_BAND_FACTOR = 0.25;

export interface UseWizardSwipeOptions {
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  containerRef: RefObject<HTMLElement | null>;
}

export interface WizardSwipeSurfaceProps {
  onPointerDownCapture: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMoveCapture: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUpCapture: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancelCapture: (event: ReactPointerEvent<HTMLElement>) => void;
}

export interface UseWizardSwipeResult {
  dragOffsetX: number;
  isDragging: boolean;
  surfaceStyle: CSSProperties;
  surfaceProps: WizardSwipeSurfaceProps;
}

export function useWizardSwipe({
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  containerRef,
}: UseWizardSwipeOptions): UseWizardSwipeResult {
  const { animate } = useMotionProfile();
  const dragActive = useRef(false);
  const axisClaimed = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const velocityX = useRef(0);
  const activePointerId = useRef<number | null>(null);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const resetDrag = useCallback(() => {
    dragActive.current = false;
    axisClaimed.current = false;
    activePointerId.current = null;
    setIsDragging(false);
    setDragOffsetX(0);
    velocityX.current = 0;
  }, []);

  const applyRubberBand = useCallback(
    (offset: number, allowed: boolean) => {
      if (allowed) {
        return offset;
      }
      return offset * RUBBER_BAND_FACTOR;
    },
    [],
  );

  const clampOffset = useCallback(
    (rawOffset: number) => {
      const width = containerRef.current?.offsetWidth ?? 320;
      const maxForward = canGoNext ? width * 0.85 : width * 0.15;
      const maxBack = canGoBack ? width * 0.85 : width * 0.15;

      if (rawOffset < 0) {
        const magnitude = Math.abs(rawOffset);
        const allowed = canGoNext;
        const clamped = Math.min(magnitude, maxForward);
        return -applyRubberBand(clamped, allowed);
      }

      const clamped = Math.min(rawOffset, maxBack);
      return applyRubberBand(clamped, canGoBack);
    },
    [applyRubberBand, canGoBack, canGoNext, containerRef],
  );

  const releaseCapture = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (activePointerId.current === null) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(activePointerId.current)) {
      event.currentTarget.releasePointerCapture(activePointerId.current);
    }

    activePointerId.current = null;
  }, []);

  const handlePointerDownCapture = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!animate || event.button !== 0) {
        return;
      }

      dragActive.current = true;
      axisClaimed.current = false;
      setIsDragging(true);
      startX.current = event.clientX;
      startY.current = event.clientY;
      lastX.current = event.clientX;
      lastTime.current = event.timeStamp;
      velocityX.current = 0;
      activePointerId.current = event.pointerId;
    },
    [animate],
  );

  const handlePointerMoveCapture = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragActive.current || activePointerId.current !== event.pointerId) {
        return;
      }

      const dx = event.clientX - startX.current;
      const dy = event.clientY - startY.current;

      if (!axisClaimed.current) {
        if (Math.abs(dx) < AXIS_SLOP_PX && Math.abs(dy) < AXIS_SLOP_PX) {
          return;
        }

        if (Math.abs(dy) > Math.abs(dx)) {
          resetDrag();
          return;
        }

        axisClaimed.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      const dt = Math.max(1, event.timeStamp - lastTime.current);
      velocityX.current = (event.clientX - lastX.current) / dt;
      lastX.current = event.clientX;
      lastTime.current = event.timeStamp;
      setDragOffsetX(clampOffset(dx));
    },
    [clampOffset, resetDrag],
  );

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragActive.current || activePointerId.current !== event.pointerId) {
        return;
      }

      releaseCapture(event);

      const width = containerRef.current?.offsetWidth ?? 320;
      const threshold = width * COMMIT_FRACTION;
      const shouldNext =
        canGoNext &&
        axisClaimed.current &&
        (dragOffsetX <= -threshold ||
          velocityX.current < -COMMIT_VELOCITY_PX_MS);
      const shouldBack =
        canGoBack &&
        axisClaimed.current &&
        (dragOffsetX >= threshold ||
          velocityX.current > COMMIT_VELOCITY_PX_MS);

      resetDrag();

      if (shouldNext) {
        onNext();
        return;
      }

      if (shouldBack) {
        onBack();
      }
    },
    [
      canGoBack,
      canGoNext,
      containerRef,
      dragOffsetX,
      onBack,
      onNext,
      releaseCapture,
      resetDrag,
    ],
  );

  const surfaceStyle: CSSProperties =
    dragOffsetX !== 0 || isDragging
      ? {
          transform: `translateX(${dragOffsetX}px)`,
          transition: isDragging
            ? "none"
            : "transform var(--motion-wizard-step) var(--ease-out-quint)",
        }
      : {};

  return {
    dragOffsetX,
    isDragging,
    surfaceStyle,
    surfaceProps: {
      onPointerDownCapture: handlePointerDownCapture,
      onPointerMoveCapture: handlePointerMoveCapture,
      onPointerUpCapture: finishDrag,
      onPointerCancelCapture: finishDrag,
    },
  };
}

/** Exported for unit tests. */
export function shouldCommitWizardSwipe(
  offsetX: number,
  containerWidth: number,
  velocityX: number,
  direction: "next" | "back",
): boolean {
  const threshold = containerWidth * COMMIT_FRACTION;
  if (direction === "next") {
    return (
      offsetX <= -threshold || velocityX < -COMMIT_VELOCITY_PX_MS
    );
  }
  return offsetX >= threshold || velocityX > COMMIT_VELOCITY_PX_MS;
}

export const WIZARD_SWIPE_AXIS_SLOP_PX = AXIS_SLOP_PX;
export const WIZARD_SWIPE_COMMIT_FRACTION = COMMIT_FRACTION;
export const WIZARD_SWIPE_COMMIT_VELOCITY_PX_MS = COMMIT_VELOCITY_PX_MS;
