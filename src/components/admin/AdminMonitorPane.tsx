import { AdminMapScreen } from "../../routes/AdminMapScreen";
import { AdminPlayerRoster } from "./AdminPlayerRoster";
import { usePlayerLocationsSync } from "../../hooks/session/useSessionExtrasSync";
import { useSessionStore } from "../../state/sessionStore";
import { InlineError } from "../ui/InlineError";

export function AdminMonitorPane({
  active,
  sessionCode,
  errorMessage,
}: {
  active: boolean;
  sessionCode?: string | null;
  errorMessage?: string | null;
}) {
  const session = useSessionStore((state) => state.session);
  const locations = usePlayerLocationsSync(active ? session?.id : undefined);

  if (errorMessage) {
    return (
      <div className="admin-monitor-pane flex h-full min-h-0 items-center justify-center rounded-xl border border-dashed border-status-error/40 bg-status-error-surface/40 px-6 py-10 text-center">
        <div className="max-w-sm space-y-3">
          <p className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
            Monitor unavailable
          </p>
          <InlineError>{errorMessage}</InlineError>
        </div>
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
            Select a live session to watch the map here on desktop.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-monitor-pane flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-xl border border-border bg-surface-deep">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0">
          <AdminMapScreen embeddedMonitor />
        </div>
        {sessionCode ? (
          <p className="admin-monitor-code-badge pointer-events-none absolute bottom-3 left-3 z-[var(--z-panel)] rounded-md border border-border bg-surface-panel/90 px-2 py-1 font-mono text-xs tracking-[0.18em] text-ink">
            {sessionCode}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 px-2 pb-2">
        <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
          Player roster
        </p>
        <AdminPlayerRoster session={session} locations={locations} />
      </div>
    </div>
  );
}
