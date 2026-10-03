import { type ReactNode, type RefObject, useRef } from "react";
import { sheetHandleStyle } from "@/components/ui/entry/entryStyles";

interface NestedSplitLayoutProps {
  children: ReactNode;
  className?: string;
  maxHeightClassName?: string;
  /** Fixed header block rendered above the scroll body. */
  pinned?: ReactNode;
  /**
   * Fixed footer below the scroll body.
   * Wrapper has no horizontal padding; callers must pad footer content.
   */
  footer?: ReactNode;
  scrollRef?: RefObject<HTMLDivElement | null>;
}

/** In-flow nested split chassis for CreateSession (not a fixed bottom overlay). */
export function NestedSplitLayout({
  children,
  className = "",
  maxHeightClassName = "max-h-[min(72dvh,640px)]",
  pinned,
  footer,
  scrollRef: externalScrollRef,
}: NestedSplitLayoutProps) {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = externalScrollRef ?? internalScrollRef;

  return (
    <div className={`relative min-h-0 hud-sheet ${className}`}>
      <div
        className={`mx-auto flex h-full min-h-0 w-full max-w-xl flex-col ${maxHeightClassName}`}
      >
        <div className="shrink-0 bg-canvas px-4 pt-3">
          <div style={sheetHandleStyle} aria-hidden="true" />
          {pinned}
        </div>
        <div
          ref={scrollRef}
          className={`jl-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-pb-4 bg-canvas px-4 ${
            footer ? "pb-4" : "pb-[max(1rem,var(--safe-area-bottom))]"
          }`}
        >
          {children}
        </div>
        {footer ? <div className="shrink-0 bg-canvas">{footer}</div> : null}
      </div>
    </div>
  );
}
