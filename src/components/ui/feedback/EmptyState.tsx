import type { ReactNode } from "react";

export type EmptyStateProps = {
  children: ReactNode;
  className?: string;
  /** Static placeholders default to note; pass status for live updating empties. */
  role?: "status" | "note";
};

/**
 * Shared empty copy for lists, boards, and recovery surfaces.
 * Survey field-book: field-ink-muted on canvas; `.jl-empty-state` keeps rule hairline under survey roots.
 */
export function EmptyState({
  children,
  className,
  role = "note",
}: EmptyStateProps) {
  return (
    <p
      role={role}
      className={["jl-empty-state text-sm leading-relaxed text-field-ink-muted", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </p>
  );
}
