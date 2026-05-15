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
      className={`pointer-events-auto fixed inset-x-0 bottom-0 z-[1000] border-t border-slate-700/80 bg-slate-950/95 backdrop-blur ${className}`}
    >
      <div className="mx-auto w-full max-w-xl">
        <div
          className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-600"
          aria-hidden="true"
        />
        <div
          className={`${maxHeightClassName} overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
