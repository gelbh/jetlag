import type { ReactNode } from "react";

export type EmptyStateProps = {
  children: ReactNode;
  className?: string;
  /** Static placeholders default to note; pass status for live updating empties. */
  role?: "status" | "note";
};

/**
 * Shared empty copy for lists, boards, and recovery surfaces.
 * Survey field-book skin via `.jl-empty-state` under `[data-player-ux-world="survey"]`.
 */
export function EmptyState({
  children,
  className,
  role = "note",
}: EmptyStateProps) {
  return (
    <p
      role={role}
      className={["jl-empty-state text-sm leading-relaxed text-ink-muted", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </p>
  );
}
