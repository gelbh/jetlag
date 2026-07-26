import {
  BUILTIN_PRESETS,
  CUSTOM_PRESET_ID,
  type DeskPreset,
} from "../../domain/admin/opsDeskLayout";

interface AdminPresetMenuProps {
  activePresetId: string;
  defaultPresetId: string;
  presetOrder: string[];
  userPresets: DeskPreset[];
  onSelectPreset: (presetId: string) => void;
  onSaveCurrent: () => void;
  onDeleteUserPreset: (presetId: string) => void;
  onSetDefault: (presetId: string) => void;
  onReorderPresets: (orderedIds: string[]) => void;
  onRenameUserPreset: (presetId: string) => void;
  onOverwriteUserPreset: () => void;
}

function presetLabel(
  id: string,
  userPresets: DeskPreset[],
): string {
  if (id === CUSTOM_PRESET_ID) return "Custom";
  const builtin = BUILTIN_PRESETS.find((p) => p.id === id);
  if (builtin) return builtin.name;
  return userPresets.find((p) => p.id === id)?.name ?? id;
}

export function AdminPresetMenu({
  activePresetId,
  defaultPresetId,
  presetOrder,
  userPresets,
  onSelectPreset,
  onSaveCurrent,
  onDeleteUserPreset,
  onSetDefault,
  onReorderPresets,
  onRenameUserPreset,
  onOverwriteUserPreset,
}: AdminPresetMenuProps) {
  const userIds = new Set(userPresets.map((p) => p.id));
  const orderedIds = (presetOrder ?? []).filter(
    (id) =>
      id === CUSTOM_PRESET_ID ||
      BUILTIN_PRESETS.some((p) => p.id === id) ||
      userIds.has(id),
  );

  const move = (id: string, delta: number) => {
    const index = orderedIds.indexOf(id);
    if (index < 0) return;
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= orderedIds.length) return;
    const next = [...orderedIds];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(nextIndex, 0, item);
    onReorderPresets(next);
  };

  return (
    <div className="jl-ops-preset-row" data-testid="admin-ops-presets">
      {orderedIds.map((presetId) => {
        const isUser = userIds.has(presetId);
        const isDefault = defaultPresetId === presetId;
        const isActive = activePresetId === presetId;
        return (
          <span key={presetId} className="jl-ops-preset-chip-wrap">
            <button
              type="button"
              className={
                isActive
                  ? "jl-ops-preset-chip jl-ops-preset-chip--active"
                  : "jl-ops-preset-chip"
              }
              aria-pressed={isActive}
              onClick={() => onSelectPreset(presetId)}
            >
              {presetLabel(presetId, userPresets)}
              {isDefault ? (
                <span className="jl-ops-preset-default-mark" aria-hidden="true">
                  ★
                </span>
              ) : null}
            </button>
            <button
              type="button"
              className="jl-ops-icon-btn"
              aria-label={
                isDefault
                  ? `${presetLabel(presetId, userPresets)} is default`
                  : `Set ${presetLabel(presetId, userPresets)} as default`
              }
              aria-pressed={isDefault}
              onClick={() => onSetDefault(presetId)}
            >
              {isDefault ? "★" : "☆"}
            </button>
            <button
              type="button"
              className="jl-ops-icon-btn"
              aria-label={`Move ${presetLabel(presetId, userPresets)} earlier`}
              onClick={() => move(presetId, -1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="jl-ops-icon-btn"
              aria-label={`Move ${presetLabel(presetId, userPresets)} later`}
              onClick={() => move(presetId, 1)}
            >
              ›
            </button>
            {isUser ? (
              <>
                <button
                  type="button"
                  className="jl-ops-icon-btn"
                  aria-label={`Rename preset ${presetLabel(presetId, userPresets)}`}
                  onClick={() => onRenameUserPreset(presetId)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="jl-ops-icon-btn"
                  aria-label={`Delete preset ${presetLabel(presetId, userPresets)}`}
                  onClick={() => onDeleteUserPreset(presetId)}
                >
                  ×
                </button>
              </>
            ) : null}
          </span>
        );
      })}
      <button
        type="button"
        className="jl-ops-preset-chip"
        onClick={onSaveCurrent}
      >
        Save as…
      </button>
      {userIds.has(activePresetId) ? (
        <button
          type="button"
          className="jl-ops-preset-chip"
          onClick={onOverwriteUserPreset}
        >
          Update preset
        </button>
      ) : null}
    </div>
  );
}
