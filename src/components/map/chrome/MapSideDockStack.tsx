import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import {
  cycleMapSideDockAnchor,
  mapSideDockIsLeft,
  nearestMapSideDockAnchor,
  useMapSideDockSide,
} from "@/hooks/map/useMapSideDockSide";

/** Move distance before a press becomes a dock drag (keeps taps working). */
const DRAG_THRESHOLD_PX = 12;
const EDGE_PAD_PX = 8;

type MapSideDockStackProps = {
  children: ReactNode;
  className?: string;
};

type DragSession = {
  pointerId: number;
  originX: number;
  originY: number;
  lastX: number;
  lastY: number;
  startLeft: number;
  startTop: number;
  width: number;
  height: number;
  armed: boolean;
};

type DragPos = { left: number; top: number };

function suppressNextClick(): void {
  const suppress = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  window.addEventListener("click", suppress, { capture: true, once: true });
  window.setTimeout(() => {
    window.removeEventListener("click", suppress, true);
  }, 500);
}

function clampDragPos(
  left: number,
  top: number,
  width: number,
  height: number,
): DragPos {
  const maxLeft = Math.max(EDGE_PAD_PX, window.innerWidth - width - EDGE_PAD_PX);
  const maxTop = Math.max(EDGE_PAD_PX, window.innerHeight - height - EDGE_PAD_PX);
  return {
    left: Math.min(maxLeft, Math.max(EDGE_PAD_PX, left)),
    top: Math.min(maxTop, Math.max(EDGE_PAD_PX, top)),
  };
}

/**
 * Viewport-fixed phone side stack: free-drag (clamped), snap to nearest of
 * six side slots from the pointer (same idea as Apple Control Center magnets).
 */
export function MapSideDockStack({ children, className }: MapSideDockStackProps) {
  const { anchor, setAnchor } = useMapSideDockSide();
  const [dragPos, setDragPos] = useState<DragPos | null>(null);
  const [dragging, setDragging] = useState(false);
  const sessionRef = useRef<DragSession | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const endDrag = useCallback(
    (snapped: boolean) => {
      const session = sessionRef.current;
      const node = rootRef.current;
      sessionRef.current = null;
      if (
        session &&
        node &&
        typeof node.hasPointerCapture === "function" &&
        node.hasPointerCapture(session.pointerId)
      ) {
        try {
          node.releasePointerCapture(session.pointerId);
        } catch {
          // already released
        }
      }
      if (snapped && session) {
        const next = nearestMapSideDockAnchor(session.lastX, session.lastY);
        setAnchor(next);
        suppressNextClick();
      }
      setDragPos(null);
      setDragging(false);
    },
    [setAnchor],
  );

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }
      session.lastX = event.clientX;
      session.lastY = event.clientY;
      const dx = event.clientX - session.originX;
      const dy = event.clientY - session.originY;
      if (!session.armed) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
          return;
        }
        session.armed = true;
        setDragging(true);
        try {
          if (typeof rootRef.current?.setPointerCapture === "function") {
            rootRef.current.setPointerCapture(session.pointerId);
          }
        } catch {
          // window listeners still drive the drag
        }
      }
      event.preventDefault();
      setDragPos(
        clampDragPos(
          session.startLeft + dx,
          session.startTop + dy,
          session.width,
          session.height,
        ),
      );
    };

    const onUp = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }
      session.lastX = event.clientX;
      session.lastY = event.clientY;
      if (session.armed) {
        event.preventDefault();
        endDrag(true);
        return;
      }
      endDrag(false);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [endDrag]);

  const onPointerDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    const node = rootRef.current;
    if (!node) {
      return;
    }
    const rect = node.getBoundingClientRect();
    sessionRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      width: rect.width,
      height: rect.height,
      armed: false,
    };
    setDragPos(null);
    setDragging(false);
  };

  const dragStyle: CSSProperties | undefined = dragPos
    ? {
        position: "fixed",
        left: dragPos.left,
        top: dragPos.top,
        right: "auto",
        bottom: "auto",
        transform: "none",
        touchAction: "none",
      }
    : { touchAction: "none" };

  return (
    <div
      ref={rootRef}
      data-chrome-side-stack="phone"
      data-anchor={anchor}
      data-side={mapSideDockIsLeft(anchor) ? "left" : "right"}
      data-dragging={dragging ? "true" : undefined}
      data-testid="map-side-dock-stack"
      role="group"
      aria-label="Session tools. Drag to reposition."
      tabIndex={0}
      className={cn(
        "jl-map-chrome-side-stack jl-map-chrome-side-stack--phone jl-map-chrome-side-stack--fixed pointer-events-auto z-[calc(var(--z-dock)+2)] flex flex-col items-stretch gap-1.5",
        className,
      )}
      style={dragStyle}
      onPointerDownCapture={onPointerDownCapture}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setAnchor(cycleMapSideDockAnchor(anchor));
        }
      }}
    >
      {children}
    </div>
  );
}
