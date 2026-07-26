import type { CSSProperties, Ref } from "react";
import {
  movePresetOrder,
  presetLabel,
  type DeskPreset,
} from "../../domain/admin/opsDeskLayout";

interface AdminPresetManageMenuProps {
  orderedIds: readonly string[];
  defaultPresetId: string;
  userPresets: DeskPreset[];
  onSetDefault: (presetId: string) => void;
  onReorderPresets: (orderedIds: string[]) => void;
  onRenameUserPreset: (presetId: string) => void;
  onDeleteUserPreset: (presetId: string) => void;
  onDismiss: () => void;
  panelRef?: Ref<HTMLDivElement>;
  style?: CSSProperties;
}

export function AdminPresetManageMenu({
  orderedIds,
  defaultPresetId,
  userPresets,
  onSetDefault,
  onReorderPresets,
  onRenameUserPreset,
  onDeleteUserPreset,
  onDismiss,
  panelRef,
  style,
}: AdminPresetManageMenuProps) {
  const userIds = new Set(userPresets.map((p) => p.id));

  return (
    <div
      ref={panelRef}
      className="jl-ops-preset-manage hud-panel"
      data-testid="admin-ops-preset-manage"
      role="group"
      aria-label="Manage presets"
      style={style}
      onClick={(event) => event.stopPropagation()}
    >
      <ul className="jl-ops-preset-manage-list">
        {orderedIds.map((presetId, index) => {
          const isUser = userIds.has(presetId);
          const isDefault = defaultPresetId === presetId;
          const label = presetLabel(presetId, userPresets);
          return (
            <li key={presetId} className="jl-ops-preset-manage-row">
              <span className="jl-ops-preset-manage-name">
                {label}
                {isDefault ? (
                  <span className="jl-ops-preset-default-mark" aria-hidden="true">
                    ★
                  </span>
                ) : null}
              </span>
              <span className="jl-ops-preset-manage-actions">
                <button
                  type="button"
                  className="jl-ops-preset-manage-btn"
                  aria-label={
                    isDefault
                      ? `${label} is default`
                      : `Set ${label} as default`
                  }
                  aria-pressed={isDefault}
                  disabled={isDefault}
                  onClick={() => onSetDefault(presetId)}
                >
                  {isDefault ? "★" : "☆"}
                </button>
                <button
                  type="button"
                  className="jl-ops-preset-manage-btn"
                  aria-label={`Move ${label} earlier`}
                  disabled={index === 0}
                  onClick={() => {
                    const next = movePresetOrder([...orderedIds], presetId, -1);
                    if (next) onReorderPresets(next);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="jl-ops-preset-manage-btn"
                  aria-label={`Move ${label} later`}
                  disabled={index === orderedIds.length - 1}
                  onClick={() => {
                    const next = movePresetOrder([...orderedIds], presetId, 1);
                    if (next) onReorderPresets(next);
                  }}
                >
                  ↓
                </button>
                {isUser ? (
                  <>
                    <button
                      type="button"
                      className="jl-ops-preset-manage-btn"
                      aria-label={`Rename preset ${label}`}
                      onClick={() => {
                        onRenameUserPreset(presetId);
                        onDismiss();
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="jl-ops-preset-manage-btn"
                      aria-label={`Delete preset ${label}`}
                      onClick={() => {
                        onDeleteUserPreset(presetId);
                        onDismiss();
                      }}
                    >
                      ×
                    </button>
                  </>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="jl-ops-preset-manage-dismiss"
        onClick={onDismiss}
      >
        Close
      </button>
    </div>
  );
}
