import { useRef, type ReactNode, type RefObject } from "react";
import type { SheetHandleProps } from "../../hooks/useSheetGesture";

interface MobileSheetProps {
  children: ReactNode;
  className?: string;
  maxHeightClassName?: string;
  /** Nested in a split layout (not floating over a full-bleed map). */
  variant?: "overlay" | "nested";
  /** Split layout: pinned header stays outside the scroll region. */
  layout?: "scroll" | "split";
  /** Fixed header block rendered above the scroll body (split layout only). */
  pinned?: ReactNode;
  scrollRef?: RefObject<HTMLDivElement | null>;
  handleProps?: SheetHandleProps;
  /** Skip paint of scroll body while sheet is exiting (perf). */
  scrollIdle?: boolean;
}

export function MobileSheet({
  children,
  className = "",
  maxHeightClassName = "max-h-[min(72dvh,640px)]",
  variant = "overlay",
  layout = "scroll",
  pinned,
  scrollRef: externalScrollRef,
  handleProps,
  scrollIdle = false,
}: MobileSheetProps) {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = externalScrollRef ?? internalScrollRef;

  const positionClass =
    variant === "nested"
      ? "relative shrink-0"
      : "pointer-events-auto fixed inset-x-0 bottom-0 z-[var(--z-dock)]";

  const handle = handleProps ? (
    <button
      type="button"
      aria-label="Drag sheet down to dismiss"
      className="jl-sheet-drag-handle mx-auto mb-3 flex w-full justify-center py-1"
      {...handleProps}
    >
      <span className="jl-sheet-handle" aria-hidden="true" />
    </button>
  ) : variant === "overlay" ? (
    <div className="jl-sheet-handle" aria-hidden="true" />
  ) : null;

  const scrollClassName = scrollIdle ? "hud-sheet-scroll--idle" : "";

  if (variant === "nested" && layout === "split") {
    return (
      <div className={`${positionClass} hud-sheet ${className}`}>
        <div
          className={`mx-auto flex w-full max-w-xl flex-col ${maxHeightClassName}`}
        >
          {children}
        </div>
      </div>
    );
  }

  if (variant === "overlay" && layout === "split") {
    return (
      <div className={`${positionClass} hud-sheet ${className}`}>
        <div
          className={`mx-auto flex w-full max-w-xl flex-col ${maxHeightClassName}`}
        >
          <div className="shrink-0 bg-surface-panel px-4 pt-3">
            {handle}
            {pinned}
          </div>
          <div
            ref={scrollRef}
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-pb-4 bg-surface-panel px-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${scrollClassName}`.trim()}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${positionClass} hud-sheet ${className}`}>
      <div className="mx-auto w-full max-w-xl">
        <div
          ref={scrollRef}
          className={`${maxHeightClassName} overflow-y-auto overscroll-contain scroll-pb-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 ${scrollClassName}`.trim()}
        >
          {handle}
          {children}
        </div>
      </div>
    </div>
  );
}
