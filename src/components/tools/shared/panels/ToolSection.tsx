import type { ReactNode } from "react";

export type ToolSectionStatus = "pending" | "active" | "complete";

interface ToolSectionProps {
  title?: string;
  status?: ToolSectionStatus;
  first?: boolean;
  compact?: boolean;
  children: ReactNode;
}

const STATUS_LABEL: Record<ToolSectionStatus, string> = {
  pending: "",
  active: "In progress",
  complete: "Done",
};

export function ToolSection({
  title,
  status = "pending",
  first = false,
  compact = false,
  children,
}: ToolSectionProps) {
  const statusLabel = STATUS_LABEL[status];
  const showHeader = !compact && title;

  return (
    <section
      className={`${compact ? "space-y-2" : "space-y-3"} ${
        first || compact ? "" : "border-t border-border/50 pt-3"
      }`}
    >
      {showHeader ? (
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="field-label m-0">{title}</h3>
          {statusLabel ? (
            <span
              className={`text-xs font-medium ${
                status === "complete"
                  ? "text-status-success"
                  : "text-status-info"
              }`}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
