import { ADMIN_PANEL_POLL_INTERVAL_MS } from "../../domain/admin/adminPanelPreferences";

interface AdminSettingsSheetProps {
  open: boolean;
  pollIntervalMs: number;
  multiplayerOnly: boolean;
  onPollIntervalChange: (value: number) => void;
  onMultiplayerOnlyChange: (value: boolean) => void;
  onClose: () => void;
}

export function AdminSettingsSheet({
  open,
  pollIntervalMs,
  multiplayerOnly,
  onPollIntervalChange,
  onMultiplayerOnlyChange,
  onClose,
}: AdminSettingsSheetProps) {
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

        <label className="field-label block">
          Refresh interval (seconds)
          <input
            type="number"
            min={5}
            max={120}
            step={5}
            value={Math.round(pollIntervalMs / 1000)}
            onChange={(event) =>
              onPollIntervalChange(Number(event.target.value) * 1000)
            }
            className="field-input mt-2"
          />
        </label>
        <p className="mt-1 text-xs text-ink-dim">
          Default {ADMIN_PANEL_POLL_INTERVAL_MS / 1000}s between background refreshes.
        </p>

        <label className="mt-4 flex min-h-11 items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={multiplayerOnly}
            onChange={(event) => onMultiplayerOnlyChange(event.target.checked)}
            className="size-4"
          />
          Show multiplayer sessions only
        </label>
      </div>
    </div>
  );
}
