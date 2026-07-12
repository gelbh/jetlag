import type { SessionRecord } from "../../domain/map/annotations";
import { APP_VERSION } from "../../domain/device/changelog";

function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function AdminDiagnosticsOverlay({
  open,
  onClose,
  session,
  syncStatusLabel,
}: {
  open: boolean;
  onClose: () => void;
  session: SessionRecord;
  syncStatusLabel: string;
}) {
  if (!open) {
    return null;
  }

  const rows: Array<{ label: string; value: string }> = [
    { label: "Session ID", value: session.id },
    { label: "Code", value: session.code ?? "—" },
    { label: "Host app version", value: session.hostAppVersion ?? "—" },
    { label: "Game size", value: session.gameSize ?? "—" },
    { label: "Tier", value: session.tier ?? "free" },
    { label: "Created", value: formatTimestamp(session.createdAt) },
    { label: "Sync", value: syncStatusLabel },
    { label: "Companion", value: APP_VERSION },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(4.75rem+env(safe-area-inset-top))] z-[var(--z-panel)] px-3">
      <section
        className="pointer-events-auto mx-auto max-w-xl rounded-xl border border-border bg-surface-panel p-3 shadow-hud-float"
        aria-label="Session diagnostics"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink">
            Diagnostics
          </h2>
          <button
            type="button"
            className="btn-secondary min-h-9 px-3 text-xs"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <dl className="space-y-2 text-xs">
          {rows.map((row) => (
            <div key={row.label} className="admin-diag-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
