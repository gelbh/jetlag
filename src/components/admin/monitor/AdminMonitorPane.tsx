import { Alert } from "@mantine/core";
import { useEffect } from "react";
import { useAdminMonitorFocus } from "../../../domain/admin/adminMonitorFocus";
import { AdminMapScreen } from "../../../routes/AdminMapScreen";

export function AdminMonitorPane({
  active,
  errorMessage,
  sessionsUnavailable = false,
}: {
  active: boolean;
  errorMessage?: string | null;
  sessionsUnavailable?: boolean;
}) {
  const setFocusedPlayerUid = useAdminMonitorFocus((state) => state.setFocusedPlayerUid);

  useEffect(() => {
    if (!active) {
      setFocusedPlayerUid(null);
    }
  }, [active, setFocusedPlayerUid]);

  if (errorMessage) {
    return (
      <div className="admin-monitor-pane flex h-full min-h-0 items-center justify-center rounded-xl border border-dashed border-status-error/40 bg-status-error-surface/40 px-6 py-10 text-center">
        <Alert role="alert" title="Monitor unavailable" data-tone="mispunch" maw={384}>
          {errorMessage}
        </Alert>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="admin-monitor-pane flex h-full min-h-0 items-center justify-center rounded-xl border border-dashed border-border bg-surface-panel/60 px-6 py-10 text-center">
        <div className="space-y-2">
          <p className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
            Monitor pane
          </p>
          <p className="text-sm text-ink-muted">
            {sessionsUnavailable
              ? "Sessions unavailable. Retry from the Sessions panel."
              : "Select a live session to watch the map here."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="admin-monitor-pane flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-deep"
      data-testid="admin-monitor-fixed"
    >
      <AdminMapScreen embeddedMonitor />
    </div>
  );
}
