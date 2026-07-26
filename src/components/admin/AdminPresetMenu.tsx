import {
  BUILTIN_PRESETS,
  CUSTOM_PRESET_ID,
  type DeskPreset,
} from "../../domain/admin/opsDeskLayout";

interface AdminPresetMenuProps {
  activePresetId: string;
  userPresets: DeskPreset[];
  onSelectPreset: (presetId: string) => void;
  onSaveCurrent: () => void;
  onDeleteUserPreset: (presetId: string) => void;
}

export function AdminPresetMenu({
  activePresetId,
  userPresets,
  onSelectPreset,
  onSaveCurrent,
  onDeleteUserPreset,
}: AdminPresetMenuProps) {
  return (
    <div className="jl-ops-preset-row" data-testid="admin-ops-presets">
      {BUILTIN_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={
            activePresetId === preset.id
              ? "jl-ops-preset-chip jl-ops-preset-chip--active"
              : "jl-ops-preset-chip"
          }
          aria-pressed={activePresetId === preset.id}
          onClick={() => onSelectPreset(preset.id)}
        >
          {preset.name}
        </button>
      ))}
      <button
        type="button"
        className={
          activePresetId === CUSTOM_PRESET_ID
            ? "jl-ops-preset-chip jl-ops-preset-chip--active"
            : "jl-ops-preset-chip"
        }
        aria-pressed={activePresetId === CUSTOM_PRESET_ID}
        onClick={() => onSelectPreset(CUSTOM_PRESET_ID)}
      >
        Custom
      </button>
      {userPresets.map((preset) => (
        <span key={preset.id} className="inline-flex items-center gap-1">
          <button
            type="button"
            className={
              activePresetId === preset.id
                ? "jl-ops-preset-chip jl-ops-preset-chip--active"
                : "jl-ops-preset-chip"
            }
            aria-pressed={activePresetId === preset.id}
            onClick={() => onSelectPreset(preset.id)}
          >
            {preset.name}
          </button>
          <button
            type="button"
            className="jl-ops-icon-btn"
            aria-label={`Delete preset ${preset.name}`}
            onClick={() => onDeleteUserPreset(preset.id)}
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        className="jl-ops-preset-chip"
        onClick={onSaveCurrent}
      >
        Save current as…
      </button>
    </div>
  );
}
