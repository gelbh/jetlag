import { useEffect, useRef } from "react";
import { useAppNavigate } from "./useAppNavigate";
import { useMotionProfile } from "./useMotionProfile";

const EDGE_ZONE_PX = 18;
const COMMIT_DRAG_PX = 72;
const COMMIT_VELOCITY_PX_MS = 0.35;

function isDeniedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest('[data-edge-swipe="off"]')) {
    return true;
  }

  if (target.closest(".leaflet-container")) {
    return true;
  }

  if (target.closest("input, textarea, select, [contenteditable='true']")) {
    return true;
  }

  if (target.closest("[data-sheet-dragging='true'], [data-panel-dragging='true']")) {
    return true;
  }

  return false;
}

/** Global left-edge swipe to navigate back when history allows. */
export function useEdgeSwipeBack(): void {
  const navigate = useAppNavigate();
  const { animate } = useMotionProfile();
  const activeRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);

  useEffect(() => {
    if (!animate) {
      return;
    }

    const reset = () => {
      activeRef.current = false;
      velocityRef.current = 0;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (event.clientX > EDGE_ZONE_PX) {
        return;
      }

      if (isDeniedTarget(event.target)) {
        return;
      }

      if (!navigate.canGoBack()) {
        return;
      }

      activeRef.current = true;
      startXRef.current = event.clientX;
      startYRef.current = event.clientY;
      lastXRef.current = event.clientX;
      lastTimeRef.current = event.timeStamp;
      velocityRef.current = 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!activeRef.current) {
        return;
      }

      const dx = event.clientX - startXRef.current;
      const dy = Math.abs(event.clientY - startYRef.current);

      if (dy > Math.abs(dx) && dy > 24) {
        reset();
        return;
      }

      const dt = Math.max(1, event.timeStamp - lastTimeRef.current);
      velocityRef.current = (event.clientX - lastXRef.current) / dt;
      lastXRef.current = event.clientX;
      lastTimeRef.current = event.timeStamp;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!activeRef.current) {
        return;
      }

      const dx = event.clientX - startXRef.current;
      const shouldCommit =
        dx >= COMMIT_DRAG_PX || velocityRef.current >= COMMIT_VELOCITY_PX_MS;

      reset();

      if (shouldCommit && navigate.canGoBack()) {
        navigate.goBack();
      }
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("pointercancel", onPointerUp, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };
  }, [animate, navigate]);
}
