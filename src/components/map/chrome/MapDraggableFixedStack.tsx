import {
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  MAP_CHROME_DOCKS_CHANGE_EVENT,
  type MapChromeDockId,
  readMapChromeDocksState,
  writeMapChromeDocksState,
} from "@/hooks/map/mapChromeDockPlacement";
import {
  cycleMapChromeDockPlacement,
  legacyAnchorFromPlacement,
  type MapChromeDockPlacement,
  resolveSafeAreaTopPx,
  resolveStackedTops,
  resolveUsableVerticalBand,
  sideFromPointX,
  topPxFromTopRatio,
  topRatioFromTopPx,
} from "@/hooks/map/useMapSideDockSide";
import { cn } from "@/lib/cn";

const DRAG_THRESHOLD_PX = 12;
const EDGE_PAD_PX = 12;
const PEER_GAP_PX = 14;
const SETTLE_MS = 640;
const SETTLE_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
const DRAG_SCALE = 1.03;

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
  frame: DockFrame;
};

type DragPos = { left: number; top: number };
type PeerRect = Pick<DOMRect, "left" | "top" | "right" | "bottom" | "height">;
type SettleFrame = { left: number; top: number; scale: number };
type DockFrame = { left: number; top: number; width: number; height: number };

function viewportFrame(): DockFrame {
  return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
}

function dockFrame(node: HTMLElement | null): DockFrame {
  const frame = node?.closest<HTMLElement>("[data-map-dock-frame]");
  if (!frame || !/layout|content|strict/.test(getComputedStyle(frame).contain)) {
    return viewportFrame();
  }
  const { left, top, width, height } = frame.getBoundingClientRect();
  return { left, top, width, height };
}

function frameLocalRect(rect: PeerRect, frame: DockFrame): PeerRect {
  return {
    left: rect.left - frame.left,
    right: rect.right - frame.left,
    top: rect.top - frame.top,
    bottom: rect.bottom - frame.top,
    height: rect.height,
  };
}

export type MapDraggableFixedStackProps = {
  placement: MapChromeDockPlacement;
  setPlacement: (placement: MapChromeDockPlacement) => void;
  children: ReactNode;
  className?: string;
  testId: string;
  ariaLabel: string;
  chromeRole: MapChromeDockId;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function edgePadPx(): number {
  return EDGE_PAD_PX;
}

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
  frame: DockFrame,
): DragPos {
  const pad = edgePadPx();
  const maxLeft = Math.max(pad, frame.width - width - pad);
  const { minTop, maxBottom } = resolveUsableVerticalBand(frame.height);
  const maxTop = Math.max(minTop, maxBottom - height);
  return {
    left: Math.min(maxLeft, Math.max(pad, left)),
    top: Math.min(maxTop, Math.max(minTop, top)),
  };
}

function rectsOverlap(
  left: number,
  top: number,
  width: number,
  height: number,
  peer: PeerRect,
  gap: number,
): boolean {
  return (
    left < peer.right + gap &&
    left + width > peer.left - gap &&
    top < peer.bottom + gap &&
    top + height > peer.top - gap
  );
}

export function separateFromPeerRect(
  left: number,
  top: number,
  width: number,
  height: number,
  peer: PeerRect | null,
  gap = PEER_GAP_PX,
  frame: DockFrame = viewportFrame(),
): DragPos {
  const clamp = (l: number, t: number) => clampDragPos(l, t, width, height, frame);
  const desired = clamp(left, top);
  if (!peer) {
    return desired;
  }
  if (!rectsOverlap(desired.left, desired.top, width, height, peer, gap)) {
    return desired;
  }

  const exclLeft = peer.left - gap;
  const exclRight = peer.right + gap;
  const exclTop = peer.top - gap;
  const exclBottom = peer.bottom + gap;

  const candidates: DragPos[] = [
    clamp(exclLeft - width, desired.top),
    clamp(exclRight, desired.top),
    clamp(desired.left, exclTop - height),
    clamp(desired.left, exclBottom),
  ];

  let best: DragPos | null = null;
  let bestDist = Infinity;
  for (const candidate of candidates) {
    if (rectsOverlap(candidate.left, candidate.top, width, height, peer, gap)) {
      continue;
    }
    const dist = Math.hypot(candidate.left - desired.left, candidate.top - desired.top);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  if (best) {
    return best;
  }

  const pushLeft = desired.left + width - exclLeft;
  const pushRight = exclRight - desired.left;
  const pushUp = desired.top + height - exclTop;
  const pushDown = exclBottom - desired.top;
  const minPush = Math.min(pushLeft, pushRight, pushUp, pushDown);
  if (minPush === pushLeft) {
    return clamp(desired.left - pushLeft, desired.top);
  }
  if (minPush === pushRight) {
    return clamp(desired.left + pushRight, desired.top);
  }
  if (minPush === pushUp) {
    return clamp(desired.left, desired.top - pushUp);
  }
  return clamp(desired.left, desired.top + pushDown);
}

function peerStackEl(self: HTMLElement | null): HTMLElement | null {
  if (!self || typeof document === "undefined") {
    return null;
  }
  const peers = document.querySelectorAll<HTMLElement>(
    "[data-chrome-side-stack='phone'], [data-chrome-nav-stack='phone']",
  );
  for (const peer of peers) {
    if (peer !== self) {
      return peer;
    }
  }
  return null;
}

function cancelElementAnimations(el: HTMLElement): void {
  const animations = typeof el.getAnimations === "function" ? el.getAnimations() : [];
  for (const running of animations) {
    running.cancel();
  }
}

function playSettleFlip(el: HTMLElement, from: SettleFrame, onDone: () => void): Animation | null {
  const to = el.getBoundingClientRect();
  const dx = from.left - to.left;
  const dy = from.top - to.top;
  if (Math.hypot(dx, dy) < 0.5 && Math.abs(from.scale - 1) < 0.01) {
    onDone();
    return null;
  }
  if (prefersReducedMotion() || typeof el.animate !== "function") {
    onDone();
    return null;
  }
  cancelElementAnimations(el);
  // Transform-only FLIP. Never clear left/right/top: React owns EDGE_PAD rest.
  el.style.willChange = "transform";
  const anim = el.animate(
    [
      {
        transform: `translate(${dx}px, ${dy}px) scale(${from.scale})`,
      },
      {
        transform: "translate(0px, 0px) scale(1)",
      },
    ],
    {
      duration: SETTLE_MS,
      easing: SETTLE_EASING,
      // none: cancel (Strict Mode cleanup) must not freeze mid-frame or call onDone.
      fill: "none",
    },
  );
  let completed = false;
  const finish = () => {
    if (completed) {
      return;
    }
    completed = true;
    el.style.willChange = "";
    el.style.transform = "";
    onDone();
  };
  // Finish only. Cancel must leave settleFromRef so remount can replay.
  anim.addEventListener("finish", finish);
  return anim;
}

export function MapDraggableFixedStack({
  placement,
  setPlacement,
  children,
  className,
  testId,
  ariaLabel,
  chromeRole,
}: MapDraggableFixedStackProps) {
  const [dragPos, setDragPos] = useState<DragPos | null>(null);
  const [dragging, setDragging] = useState(false);
  const [settling, setSettling] = useState(false);
  const [stackHeight, setStackHeight] = useState(200);
  const [frameHeight, setFrameHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 800,
  );
  const [edgePad] = useState(() => (typeof window !== "undefined" ? edgePadPx() : EDGE_PAD_PX));
  const sessionRef = useRef<DragSession | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const settleFromRef = useRef<SettleFrame | null>(null);
  const placementRef = useRef(placement);
  const draggingRef = useRef(false);
  const settleAnimRef = useRef<Animation | null>(null);

  useEffect(() => {
    placementRef.current = placement;
    draggingRef.current = dragging;
  }, [placement, dragging]);

  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node || dragging || dragPos) {
      return;
    }
    const height = node.getBoundingClientRect().height;
    if (height > 0 && Math.abs(height - stackHeight) > 1) {
      setStackHeight(height);
    }
    const frame = dockFrame(node);
    if (frame.height > 0 && Math.abs(frame.height - frameHeight) > 1) {
      setFrameHeight(frame.height);
    }
  }, [dragging, dragPos, placement, stackHeight, frameHeight, children]);

  // The stack can mount inside a map container that is not attached yet, so the
  // frame is resolved once the stack itself gets a layout box.
  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }
    let frameEl: HTMLElement | null = null;
    const observer = new ResizeObserver(() => {
      const nextFrameEl = node.closest<HTMLElement>("[data-map-dock-frame]");
      if (nextFrameEl && nextFrameEl !== frameEl) {
        frameEl = nextFrameEl;
        observer.observe(nextFrameEl);
      }
      const { height } = dockFrame(node);
      if (height > 0) {
        setFrameHeight(height);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const safeTop = typeof window !== "undefined" ? resolveSafeAreaTopPx() : 0;
  const restTop = topPxFromTopRatio(placement.topRatio, stackHeight, frameHeight, safeTop);

  useEffect(() => {
    const capture = () => {
      const el = rootRef.current;
      if (!el || draggingRef.current || sessionRef.current?.armed || settleFromRef.current) {
        return;
      }
      const next = readMapChromeDocksState()[chromeRole];
      const cur = placementRef.current;
      if (next.side === cur.side && Math.abs(next.topRatio - cur.topRatio) < 0.0001) {
        return;
      }
      const rect = el.getBoundingClientRect();
      settleFromRef.current = { left: rect.left, top: rect.top, scale: 1 };
    };
    window.addEventListener(MAP_CHROME_DOCKS_CHANGE_EVENT, capture);
    return () => {
      window.removeEventListener(MAP_CHROME_DOCKS_CHANGE_EVENT, capture);
    };
  }, [chromeRole]);

  useLayoutEffect(() => {
    if (dragging || dragPos) {
      return;
    }
    const el = rootRef.current;
    const from = settleFromRef.current;
    if (!el || !from) {
      return;
    }
    // Keep frame until finish so React Strict Mode remount can replay.
    setSettling(true);
    settleAnimRef.current?.cancel();
    settleAnimRef.current = null;
    const anim = playSettleFlip(el, from, () => {
      if (settleFromRef.current === from) {
        settleFromRef.current = null;
      }
      settleAnimRef.current = null;
      setSettling(false);
    });
    settleAnimRef.current = anim;
    return () => {
      // Strict Mode: abort WAAPI only. Do not clear settleFromRef (cancel ≠ done).
      anim?.cancel();
      if (settleAnimRef.current === anim) {
        settleAnimRef.current = null;
      }
    };
  }, [placement, dragging, dragPos]);

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
        } catch {}
      }
      if (snapped && session && node) {
        const from = node.getBoundingClientRect();
        const { frame } = session;
        const vh = frame.height;
        const safeTop = resolveSafeAreaTopPx();
        const side = sideFromPointX(session.lastX - frame.left, frame.width);
        const height = Math.max(session.height, from.height);
        let moverTop = from.top - frame.top;
        const peerEl = peerStackEl(node);
        const peerBox = peerEl?.getBoundingClientRect();
        const peerRect = peerBox ? frameLocalRect(peerBox, frame) : null;
        const peerSide = peerEl?.dataset.side as "left" | "right" | undefined;

        settleFromRef.current = {
          left: from.left,
          top: from.top,
          scale: DRAG_SCALE,
        };

        if (peerRect && peerSide === side) {
          const preferAbove = moverTop + from.height / 2 <= (peerRect.top + peerRect.bottom) / 2;
          const stacked = resolveStackedTops({
            moverTop,
            moverHeight: height,
            peerTop: peerRect.top,
            peerHeight: peerRect.height,
            preferAbove,
            viewportHeight: vh,
            gap: PEER_GAP_PX,
            safeAreaTopPx: safeTop,
          });
          moverTop = stacked.moverTop;
          const peerId: MapChromeDockId = chromeRole === "side" ? "nav" : "side";
          const state = readMapChromeDocksState();
          const peerPlacement: MapChromeDockPlacement = {
            side,
            topRatio: topRatioFromTopPx(stacked.peerTop, peerRect.height, vh, safeTop),
          };
          const moverPlacement: MapChromeDockPlacement = {
            side,
            topRatio: topRatioFromTopPx(moverTop, height, vh, safeTop),
          };
          writeMapChromeDocksState({
            ...state,
            [chromeRole]: moverPlacement,
            [peerId]: peerPlacement,
          });
          setPlacement(moverPlacement);
          setDragPos(null);
          setDragging(false);
          suppressNextClick();
          return;
        }

        const moverPlacement: MapChromeDockPlacement = {
          side,
          topRatio: topRatioFromTopPx(moverTop, height, vh, safeTop),
        };
        setPlacement(moverPlacement);
        setDragPos(null);
        setDragging(false);
        suppressNextClick();
        return;
      }
      settleFromRef.current = null;
      setDragPos(null);
      setDragging(false);
    },
    [chromeRole, setPlacement],
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
        } catch {}
        requestAnimationFrame(() => {
          const live = sessionRef.current;
          const node = rootRef.current;
          if (!live || !node || live.pointerId !== session.pointerId) {
            return;
          }
          const grown = node.getBoundingClientRect();
          live.width = grown.width;
          live.height = grown.height;
          live.startLeft = grown.left - live.frame.left - (event.clientX - live.originX);
          live.startTop = grown.top - live.frame.top - (event.clientY - live.originY);
        });
      }
      event.preventDefault();
      const peerBox = peerStackEl(rootRef.current)?.getBoundingClientRect();
      setDragPos(
        separateFromPeerRect(
          session.startLeft + dx,
          session.startTop + dy,
          session.width,
          session.height,
          peerBox ? frameLocalRect(peerBox, session.frame) : null,
          PEER_GAP_PX,
          session.frame,
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
    cancelElementAnimations(node);
    settleAnimRef.current = null;
    settleFromRef.current = null;
    const rect = node.getBoundingClientRect();
    const frame = dockFrame(node);
    sessionRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      startLeft: rect.left - frame.left,
      startTop: rect.top - frame.top,
      width: rect.width,
      height: rect.height,
      armed: false,
      frame,
    };
    setDragPos(null);
    setDragging(false);
    setSettling(false);
  };

  const pad = edgePad;
  const restStyle: CSSProperties = {
    position: "fixed",
    top: restTop,
    bottom: "auto",
    transform: "none",
    touchAction: "none",
    ...(placement.side === "left" ? { left: pad, right: "auto" } : { right: pad, left: "auto" }),
  };

  const dragStyle: CSSProperties | undefined = dragPos
    ? {
        position: "fixed",
        left: dragPos.left,
        top: dragPos.top,
        right: "auto",
        bottom: "auto",
        transform: `scale(${DRAG_SCALE})`,
        transformOrigin: "center center",
        touchAction: "none",
      }
    : restStyle;

  const chromeAttr = chromeRole === "nav" ? "data-chrome-nav-stack" : "data-chrome-side-stack";
  const anchor = legacyAnchorFromPlacement(placement);

  return (
    <div
      ref={rootRef}
      {...{ [chromeAttr]: "phone" }}
      data-anchor={anchor}
      data-side={placement.side}
      data-dragging={dragging ? "true" : undefined}
      data-settling={settling ? "true" : undefined}
      data-testid={testId}
      role="group"
      aria-label={ariaLabel}
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
          const el = rootRef.current;
          if (el) {
            const rect = el.getBoundingClientRect();
            settleFromRef.current = {
              left: rect.left,
              top: rect.top,
              scale: 1,
            };
          }
          setPlacement(cycleMapChromeDockPlacement(placement));
        }
      }}
    >
      {children}
    </div>
  );
}
