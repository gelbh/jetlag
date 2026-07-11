import {
  useEffect,
  useRef,
  type ReactNode,
  type RefCallback,
  type RefObject,
} from "react";
import { useAnimatedPresence } from "../../hooks/useAnimatedPresence";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useSheetGesture } from "../../hooks/useSheetGesture";
import { useMotionProfile } from "../../hooks/location/useMotionProfile";
import { MobileSheet } from "./MobileSheet";

interface AnimatedOverlayProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Fixed header above the scroll body (e.g. sheet title and tabs). */
  pinned?: ReactNode;
  dismissible?: boolean;
  ariaLabel?: string;
  sheetClassName?: string;
  maxHeightClassName?: string;
  /** Scrim enter/exit classes (defaults match sheet timing). */
  scrimEnterClass?: string;
  scrimExitClass?: string;
}

function mergeRefs<T>(
  ...refs: Array<RefCallback<T> | RefObject<T | null> | null | undefined>
) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) {
        continue;
      }
      if (typeof ref === "function") {
        ref(node);
      } else {
        ref.current = node;
      }
    }
  };
}

export function AnimatedOverlay({
  open,
  onClose,
  children,
  pinned,
  dismissible = true,
  ariaLabel,
  sheetClassName = "",
  maxHeightClassName,
  scrimEnterClass = "hud-scrim-enter",
  scrimExitClass = "hud-scrim-exit",
}: AnimatedOverlayProps) {
  const { animate } = useMotionProfile();
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    mounted,
    phase,
    animClass,
    requestClose,
    setAnimNode,
  } = useAnimatedPresence({
    open,
    onClose,
    enterClass: "hud-sheet-enter",
    exitClass: "hud-sheet-exit",
  });

  const gesture = useSheetGesture({
    enabled:
      dismissible &&
      animate &&
      (phase === "open" || phase === "entering"),
    onDismiss: requestClose,
    scrollRef,
  });

  useScrollLock(mounted);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        requestClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mounted, requestClose, dismissible]);

  if (!mounted) {
    return null;
  }

  const scrimAnimClass =
    phase === "entering"
      ? scrimEnterClass
      : phase === "exiting"
        ? scrimExitClass
        : "";

  return (
    <div
      className={`pointer-events-auto fixed inset-0 z-[var(--z-modal)] overscroll-contain hud-scrim ${scrimAnimClass}`}
      style={gesture.scrimStyle}
      onClick={dismissible ? requestClose : undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape" && dismissible) {
          requestClose();
        }
      }}
    >
      <div
        ref={mergeRefs(gesture.sheetRef, setAnimNode)}
        style={gesture.sheetStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <MobileSheet
          className={`${animClass} ${sheetClassName}`.trim()}
          layout={pinned ? "split" : "scroll"}
          maxHeightClassName={maxHeightClassName}
          pinned={pinned}
          scrollRef={scrollRef}
          handleProps={dismissible ? gesture.handleProps : undefined}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
          >
            {children}
          </div>
        </MobileSheet>
      </div>
    </div>
  );
}
