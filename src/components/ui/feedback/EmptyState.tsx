import type { ReactNode } from "react";

export type EmptyStateProps = {
  children: ReactNode;
  className?: string;
  /** Default status for live regions; use note for static list placeholders. */
  role?: "status" | "note";
};

/**
 * Shared empty copy for lists, boards, and recovery surfaces.
 * Survey field-book skin via `.jl-empty-state` under `[data-player-ux-world="survey"]`.
 */
export function EmptyState({
  children,
  className,
  role = "status",
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
