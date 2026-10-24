import type { ReactNode } from "react";

export type EmptyStateProps = {
  children: ReactNode;
  className?: string;
  role?: "status" | "note";
};

export function EmptyState({ children, className, role = "note" }: EmptyStateProps) {
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
