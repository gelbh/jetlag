import type { ReactNode } from "react";

interface MobileSheetProps {
  children: ReactNode;
  className?: string;
  maxHeightClassName?: string;
  /** Nested in a split layout (not floating over a full-bleed map). */
  variant?: "overlay" | "nested";
}

export function MobileSheet({
  children,
  className = "",
  maxHeightClassName = "max-h-[min(72dvh,640px)]",
  variant = "overlay",
}: MobileSheetProps) {
  const positionClass =
    variant === "nested"
      ? "relative shrink-0"
      : "pointer-events-auto fixed inset-x-0 bottom-0 z-[var(--z-dock)]";

  return (
    <div className={`${positionClass} hud-sheet ${className}`}>
      <div className="mx-auto w-full max-w-xl">
        <div
          className={`${maxHeightClassName} overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3`}
        >
          {variant === "overlay" ? (
            <div className="jl-sheet-handle" aria-hidden="true" />
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
