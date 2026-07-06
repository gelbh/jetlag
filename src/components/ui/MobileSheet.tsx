import type { ReactNode } from "react";

interface MobileSheetProps {
  children: ReactNode;
  className?: string;
  maxHeightClassName?: string;
}

export function MobileSheet({
  children,
  className = "",
  maxHeightClassName = "max-h-[min(72dvh,640px)]",
}: MobileSheetProps) {
  return (
    <div
      className={`pointer-events-auto fixed inset-x-0 bottom-0 z-[var(--z-dock)] hud-sheet ${className}`}
    >
      <div className="mx-auto w-full max-w-xl">
        <div
          className={`${maxHeightClassName} overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3`}
        >
          <div className="jl-sheet-handle" aria-hidden="true" />
          {children}
        </div>
      </div>
    </div>
  );
}
