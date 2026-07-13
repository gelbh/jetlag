import type { ReactNode } from "react";

export function AdminDashboardLayout({
  listFilters,
  listRows,
  monitor,
  showMonitor,
}: {
  listFilters: ReactNode;
  listRows: ReactNode;
  monitor: ReactNode;
  showMonitor: boolean;
}) {
  if (!showMonitor) {
    return (
      <div className="space-y-3">
        {listFilters}
        {listRows}
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:h-full lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-stretch">
      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="shrink-0">{listFilters}</div>
        <div className="admin-dashboard-list-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          {listRows}
        </div>
      </div>
      <div className="hidden min-h-0 min-w-0 lg:block">{monitor}</div>
    </div>
  );
}
