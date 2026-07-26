import { useEffect, useId, useState } from "react";

export type AdminPresetDialogMode = "save" | "rename" | "overwrite";

interface AdminPresetDialogProps {
  open: boolean;
  mode: AdminPresetDialogMode;
  initialName?: string;
  title: string;
  confirmLabel: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function AdminPresetDialog({
  open,
  mode,
  initialName = "",
  title,
  confirmLabel,
  onConfirm,
  onCancel,
}: AdminPresetDialogProps) {
  const titleId = useId();
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  if (!open) return null;

  return (
    <div className="jl-ops-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="jl-ops-dialog hud-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="admin-ops-preset-dialog"
        data-mode={mode}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="jl-ops-dialog-title">
          {title}
        </h2>
        {mode === "overwrite" ? (
          <p className="jl-ops-dialog-body">
            Replace “{initialName}” with the current desk layout?
          </p>
        ) : (
          <label className="jl-ops-dialog-field">
            <span className="jl-ops-dialog-label">Name</span>
            <input
              className="field-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </label>
        )}
        <div className="jl-ops-dialog-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (mode === "overwrite") {
                onConfirm(initialName);
                return;
              }
              onConfirm(name);
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
