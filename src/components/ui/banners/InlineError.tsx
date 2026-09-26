import type { ReactNode } from "react";
import {
  askInlineErrorCopy,
  isLocationInlineError,
} from "@/components/tools/shared/readout/AskInlineError";

interface InlineErrorProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

/** Soft alert strip for failures (GPS timeout gets title + detail). */
export function InlineError({ children, className = "", id }: InlineErrorProps) {
  const copy =
    typeof children === "string" && isLocationInlineError(children)
      ? askInlineErrorCopy(children)
      : null;

  return (
    <div
      id={id}
      role="alert"
      className={`jl-selectable flex gap-2.5 rounded-lg border border-halt/25 bg-halt/10 px-3 py-2.5 text-sm text-halt ${className}`.trim()}
    >
      <span className="mt-0.5 shrink-0 text-halt" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 4.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.9" fill="currentColor" />
        </svg>
      </span>
      {copy ? (
        <div className="min-w-0 flex-1">
          <p className="m-0 font-semibold leading-snug">{copy.title}</p>
          <p className="mt-0.5 mb-0 text-xs leading-snug text-field-ink">
            {copy.detail}
          </p>
        </div>
      ) : (
        <p className="m-0 min-w-0 flex-1 leading-snug">{children}</p>
      )}
    </div>
  );
}
