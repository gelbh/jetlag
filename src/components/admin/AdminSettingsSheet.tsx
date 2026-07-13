interface AdminSettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AdminSettingsSheet({ open, onClose }: AdminSettingsSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface-panel p-4 shadow-hud-float"
        role="dialog"
        aria-labelledby="admin-settings-title"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            id="admin-settings-title"
            className="font-display text-lg font-semibold uppercase tracking-wide text-ink"
          >
            Panel settings
          </h2>
          <button type="button" className="btn-secondary min-h-10 px-3 text-xs" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="text-sm text-ink-muted">
          The session list refreshes manually. Use the Refresh button or load more
          at the bottom of the list. Monitoring uses realtime listeners while a
          session is selected.
        </p>
      </div>
    </div>
  );
}
