import { type CSSProperties, forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Map-safe overlay chassis: fixed phone band.
 * Horizontal padding = max(token, shell-composed L/R safe) so hunt/ask share one
 * content box. `--jl-shell-safe-*` subtracts letterbox under PlayerPhoneShell;
 * env() fallback covers chrome outside the shell.
 */
export const OVERLAY_SAFE_PAD_X =
  "ps-[max(0.75rem,var(--jl-shell-safe-left,env(safe-area-inset-left)))] pe-[max(0.75rem,var(--jl-shell-safe-right,env(safe-area-inset-right)))]";

export interface OverlayHostProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export const OverlayHost = forwardRef<HTMLDivElement, OverlayHostProps>(function OverlayHost(
  { className, style, children },
  ref,
) {
  return (
    <div
      ref={ref}
      data-overlay-host=""
      data-layout="phone"
      className={cn(
        "jl-map-bottom-chrome-host",
        "pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-dock)]",
        OVERLAY_SAFE_PAD_X,
        /* Bottom float gap: real CSS --dock-float-gap on host */
        "pt-1.5",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
});
