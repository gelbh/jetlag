import { Box, UnstyledButton } from "@mantine/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const ACTION_WIDTH = 74;
const OPEN_THRESHOLD = 44;
const FULL_SWIPE_EXTRA = 56;

type SwipeRegistry = {
  openId: string | null;
  setOpenId: (id: string | null) => void;
};

const FriendSwipeRegistryContext = createContext<SwipeRegistry | null>(null);

/** Keeps at most one friends swipe row open (iOS Mail parity). */
export function FriendSwipeRegistry({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <FriendSwipeRegistryContext.Provider value={{ openId, setOpenId }}>
      {children}
    </FriendSwipeRegistryContext.Provider>
  );
}

export function FriendSwipeRow({
  actionCount,
  actions,
  children,
  onOpen,
  onFullSwipe,
}: {
  actionCount: number;
  actions: ReactNode;
  children: ReactNode;
  onOpen?: () => void;
  /** Fired when the user flings past the actions (primary / trailing action). */
  onFullSwipe?: () => void;
}) {
  const rowId = useId();
  const registry = useContext(FriendSwipeRegistryContext);
  const revealWidth = Math.max(actionCount, 1) * ACTION_WIDTH;
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const offsetRef = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const axis = useRef<"undecided" | "x" | "y">("undecided");
  const moved = useRef(false);

  const setOffsetBoth = useCallback((value: number) => {
    offsetRef.current = value;
    setOffset(value);
  }, []);

  const rubberBand = useCallback(
    (raw: number) => {
      if (raw >= 0) {
        return Math.min(12, raw * 0.2);
      }
      if (raw >= -revealWidth) {
        return raw;
      }
      const over = -revealWidth - raw;
      return -revealWidth - Math.min(120, over * 0.35);
    },
    [revealWidth],
  );

  useEffect(() => {
    if (!registry) {
      return;
    }
    if (registry.openId !== rowId && offsetRef.current !== 0) {
      setOffsetBoth(0);
    }
  }, [registry, registry?.openId, rowId, setOffsetBoth]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    startX.current = event.clientX;
    startY.current = event.clientY;
    startOffset.current = offsetRef.current;
    axis.current = "undecided";
    moved.current = false;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    const dx = event.clientX - startX.current;
    const dy = event.clientY - startY.current;
    if (axis.current === "undecided") {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
        return;
      }
      axis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (axis.current !== "x") {
      return;
    }
    moved.current = true;
    setOffsetBoth(rubberBand(startOffset.current + dx));
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);
    if (axis.current !== "x") {
      return;
    }
    const current = offsetRef.current;
    if (onFullSwipe && current <= -(revealWidth + FULL_SWIPE_EXTRA)) {
      setOffsetBoth(0);
      registry?.setOpenId(null);
      onFullSwipe();
      return;
    }
    if (current < -OPEN_THRESHOLD) {
      setOffsetBoth(-revealWidth);
      registry?.setOpenId(rowId);
      return;
    }
    setOffsetBoth(0);
    if (registry?.openId === rowId) {
      registry.setOpenId(null);
    }
  };

  const openRow = () => {
    if (moved.current) {
      return;
    }
    if (offsetRef.current !== 0) {
      setOffsetBoth(0);
      if (registry?.openId === rowId) {
        registry.setOpenId(null);
      }
      return;
    }
    registry?.setOpenId(null);
    onOpen?.();
  };

  const onClick = () => {
    // Open sheet on click (not pointerup) so the same gesture cannot hit the
    // newly mounted drawer overlay and immediately dismiss it.
    openRow();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    openRow();
  };

  return (
    <Box style={{ position: "relative", overflow: "hidden" }}>
      <Box
        aria-hidden={offset === 0}
        style={{
          position: "absolute",
          insetBlock: 0,
          insetInlineEnd: 0,
          width: Math.max(revealWidth, -Math.min(0, offset)),
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "stretch",
        }}
      >
        {offset === 0 ? null : actions}
      </Box>
      <Box
        role="button"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClick={onClick}
        onKeyDown={onKeyDown}
        style={{
          position: "relative",
          zIndex: 1,
          transform: `translateX(${offset}px)`,
          transition: isDragging
            ? "none"
            : "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          backgroundColor:
            "color-mix(in oklch, var(--color-field-ink) 8%, var(--color-canvas))",
          touchAction: "pan-y",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** iOS Mail-style swipe action: icon over caption on a solid tone. */
export function FriendSwipeAction({
  label,
  icon,
  tone,
  onClick,
  disabled,
  primary = false,
}: {
  label: string;
  icon: ReactNode;
  tone: "flag" | "halt" | "muted";
  onClick: () => void;
  disabled?: boolean;
  /** Trailing / full-swipe action; expands when the row is pulled past open. */
  primary?: boolean;
}) {
  const background =
    tone === "flag"
      ? "var(--color-flag)"
      : tone === "halt"
        ? "var(--color-halt)"
        : "oklch(from var(--color-rule) l c h / 0.55)";
  const color =
    tone === "flag" ? "var(--color-flag-ink)" : "var(--color-field-ink)";

  return (
    <UnstyledButton
      type="button"
      disabled={disabled}
      data-jl-swipe-primary={primary ? "true" : undefined}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      styles={{
        root: {
          flex: primary ? "1 1 auto" : `0 0 ${ACTION_WIDTH}px`,
          width: primary ? "auto" : ACTION_WIDTH,
          minWidth: primary ? ACTION_WIDTH : ACTION_WIDTH,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          backgroundColor: background,
          color,
          fontSize: "0.6875rem",
          fontWeight: 590,
          letterSpacing: "0.01em",
          opacity: disabled ? 0.5 : 1,
          overflow: "hidden",
          whiteSpace: "nowrap",
        },
      }}
    >
      <Box style={{ display: "inline-flex", lineHeight: 0 }} aria-hidden>
        {icon}
      </Box>
      {label}
    </UnstyledButton>
  );
}
