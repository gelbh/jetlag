import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Map-safe overlay chassis — fixed phone band or rail fill.
 * Horizontal padding = max(token, safe-area-inset-*) so hunt/ask share one content box.
 */
export const OVERLAY_SAFE_PAD_X =
  "ps-[max(0.5rem,env(safe-area-inset-left))] pe-[max(0.5rem,env(safe-area-inset-right))]";

export type OverlayHostLayout = "phone" | "rail";

export interface OverlayHostProps {
  layout?: OverlayHostLayout;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export const OverlayHost = forwardRef<HTMLDivElement, OverlayHostProps>(
  function OverlayHost(
    { layout = "phone", className, style, children },
    ref,
  ) {
    const isRail = layout === "rail";
    return (
      <div
        ref={ref}
        data-overlay-host=""
        data-layout={layout}
        className={cn(
          "jl-map-bottom-chrome-host",
          isRail
            ? "relative inset-auto z-auto h-full w-full pointer-events-auto jl-map-bottom-chrome-host--rail"
            : cn(
                "pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-dock)]",
                OVERLAY_SAFE_PAD_X,
                "pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5",
              ),
          className,
        )}
        style={isRail ? undefined : style}
      >
        {children}
      </div>
    );
  },
);
