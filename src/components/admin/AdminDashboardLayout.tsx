import type { ReactNode } from "react";

export function AdminDashboardLayout({
  list,
  monitor,
  showMonitor,
}: {
  list: ReactNode;
  monitor: ReactNode;
  showMonitor: boolean;
}) {
  return (
    <div
      className={
        showMonitor
          ? "grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start"
          : "space-y-3"
      }
    >
      <div className="min-w-0">{list}</div>
      {showMonitor ? <div className="hidden min-w-0 lg:block">{monitor}</div> : null}
    </div>
  );
}
