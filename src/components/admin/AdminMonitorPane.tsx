import { AdminMapScreen } from "../../routes/AdminMapScreen";

export function AdminMonitorPane({
  active,
  sessionCode,
}: {
  active: boolean;
  sessionCode?: string | null;
}) {
  if (!active) {
    return (
      <div className="admin-monitor-pane flex min-h-[36rem] items-center justify-center rounded-xl border border-dashed border-border bg-surface-panel/60 px-6 py-10 text-center">
        <div className="space-y-2">
          <p className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
            Monitor pane
          </p>
          <p className="text-sm text-ink-muted">
            Select a live session to watch the map here on desktop.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-monitor-pane relative min-h-[36rem] overflow-hidden rounded-xl border border-border bg-surface-deep">
      <div className="absolute inset-0">
        <AdminMapScreen />
      </div>
      {sessionCode ? (
        <p className="pointer-events-none absolute bottom-3 left-3 z-[var(--z-panel)] rounded-md border border-border bg-surface-panel/90 px-2 py-1 font-mono text-xs tracking-[0.18em] text-ink">
          {sessionCode}
        </p>
      ) : null}
    </div>
  );
}
