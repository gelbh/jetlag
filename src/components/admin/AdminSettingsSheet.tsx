import { AdminSettingsPanel } from "./AdminSettingsPanel";

const SETTINGS_TITLE_ID = "admin-settings-title";

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
        aria-labelledby={SETTINGS_TITLE_ID}
      >
        <div className="mb-4 flex items-center justify-end">
          <button
            type="button"
            className="btn-secondary min-h-10 px-3 text-xs"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <AdminSettingsPanel titleId={SETTINGS_TITLE_ID} />
      </div>
    </div>
  );
}
