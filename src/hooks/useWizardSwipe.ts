import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { useMotionProfile } from "./location/useMotionProfile";

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
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
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
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const resetDrag = useCallback(() => {
    dragActive.current = false;
    axisClaimed.current = false;
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

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!animate) {
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
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [animate],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragActive.current) {
        return;
      }

      const dx = event.clientX - startX.current;
      const dy = event.clientY - startY.current;

      if (!axisClaimed.current) {
        if (
          Math.abs(dx) < AXIS_SLOP_PX &&
          Math.abs(dy) < AXIS_SLOP_PX
        ) {
          return;
        }

        if (Math.abs(dy) > Math.abs(dx)) {
          resetDrag();
          event.currentTarget.releasePointerCapture(event.pointerId);
          return;
        }

        axisClaimed.current = true;
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
      if (!dragActive.current) {
        return;
      }

      event.currentTarget.releasePointerCapture(event.pointerId);

      const width = containerRef.current?.offsetWidth ?? 320;
      const threshold = width * COMMIT_FRACTION;
      const shouldNext =
        canGoNext &&
        (dragOffsetX <= -threshold ||
          velocityX.current < -COMMIT_VELOCITY_PX_MS);
      const shouldBack =
        canGoBack &&
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
      resetDrag,
    ],
  );

  const surfaceStyle: CSSProperties =
    dragOffsetX !== 0 || isDragging
      ? {
          transform: `translateX(${dragOffsetX}px)`,
          transition: isDragging
            ? "none"
            : "transform var(--motion-base) var(--ease-out-quint)",
        }
      : {};

  return {
    dragOffsetX,
    isDragging,
    surfaceStyle,
    surfaceProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: finishDrag,
      onPointerCancel: finishDrag,
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
