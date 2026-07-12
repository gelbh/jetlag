import type { ReactNode } from "react";
import { SheetCloseButton } from "./SheetCloseButton";
import { MotionSharedElement } from "../motion/MotionSharedElement";
import { MOTION_SHARED_ELEMENTS } from "../motion/sharedElements";

interface SheetHeaderProps {
  title: string;
  onClose: () => void;
  closeLabel?: string;
  closeVariant?: "text" | "raised";
  eyebrow?: string;
  titleSize?: "lg" | "xl";
  sticky?: boolean;
  flush?: boolean;
  className?: string;
  trailing?: ReactNode;
}

export function SheetHeader({
  title,
  onClose,
  closeLabel,
  closeVariant = "text",
  eyebrow,
  titleSize = "lg",
  sticky = false,
  flush = false,
  className = "",
  trailing,
}: SheetHeaderProps) {
  const titleClassName =
    titleSize === "xl"
      ? "font-display text-xl font-bold uppercase tracking-tight text-ink"
      : "font-display text-lg font-bold uppercase tracking-tight text-ink";

  const header = (
    <div
      className={`flex items-center justify-between gap-2 ${sticky ? "gap-3" : ""} ${className}`}
    >
      {eyebrow || titleSize === "xl" ? (
        <div>
          {eyebrow ? (
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-blue">
              {eyebrow}
            </p>
          ) : null}
          <MotionSharedElement id={MOTION_SHARED_ELEMENTS.sheetHeader}>
            <h2 className={titleClassName}>{title}</h2>
          </MotionSharedElement>
        </div>
      ) : (
        <MotionSharedElement id={MOTION_SHARED_ELEMENTS.sheetHeader}>
          <h2 className={titleClassName}>{title}</h2>
        </MotionSharedElement>
      )}
      {trailing ?? (
        <SheetCloseButton
          onClick={onClose}
          label={closeLabel}
          variant={closeVariant}
        />
      )}
    </div>
  );

  if (sticky) {
    return (
      <div className="sticky top-0 z-10 -mx-4 bg-surface-panel px-4 pb-3 pt-1">
        {header}
      </div>
    );
  }

  return <div className={flush ? className : `mb-4 ${className}`.trim()}>{header}</div>;
}
