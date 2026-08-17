import type { ReactNode } from "react";
import { SheetCloseButton } from "./SheetCloseButton";

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
      ? "font-display text-xl font-bold uppercase tracking-tight text-field-ink"
      : "font-display text-lg font-bold uppercase tracking-tight text-field-ink";

  const header = (
    <div
      className={`flex items-center justify-between gap-2 ${sticky ? "gap-3" : ""} ${className}`}
    >
      {eyebrow || titleSize === "xl" ? (
        <div>
          {eyebrow ? (
            <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-signal">
              {eyebrow}
            </p>
          ) : null}
          <h2 className={titleClassName}>{title}</h2>
        </div>
      ) : (
        <h2 className={titleClassName}>{title}</h2>
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
      <div className="sticky top-0 z-10 -mx-4 bg-canvas px-4 pb-3 pt-1">
        {header}
      </div>
    );
  }

  return <div className={flush ? className : `mb-4 ${className}`.trim()}>{header}</div>;
}
