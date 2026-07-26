import { useRef, useState, type DragEvent } from "react";
import {
  BUILTIN_PRESETS,
  CUSTOM_PRESET_ID,
  type DeskPreset,
} from "../../domain/admin/opsDeskLayout";
import {
  AdminPresetManageMenu,
  movePresetOrder,
  presetLabel,
} from "./AdminPresetManageMenu";

export { movePresetOrder, presetLabel };

const PRESET_MIME = "application/x-jl-ops-preset-id";

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
  const [manageOpen, setManageOpen] = useState(false);
  const dragActiveRef = useRef(false);
  const dragFromIdRef = useRef<string | null>(null);

  const handleDragStart = (event: DragEvent, presetId: string) => {
    dragActiveRef.current = true;
    dragFromIdRef.current = presetId;
    event.dataTransfer.setData(PRESET_MIME, presetId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    dragFromIdRef.current = null;
    window.setTimeout(() => {
      dragActiveRef.current = false;
    }, 0);
  };

  const handleDragOver = (event: DragEvent) => {
    if (![...event.dataTransfer.types].includes(PRESET_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (event: DragEvent, targetId: string) => {
    event.preventDefault();
    const fromId =
      event.dataTransfer.getData(PRESET_MIME) || dragFromIdRef.current;
    if (!fromId || fromId === targetId) return;
    const fromIndex = orderedIds.indexOf(fromId);
    const toIndex = orderedIds.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...orderedIds];
    const [item] = next.splice(fromIndex, 1);
    if (!item) return;
    next.splice(toIndex, 0, item);
    onReorderPresets(next);
  };

  return (
    <div className="jl-ops-preset-row" data-testid="admin-ops-presets">
      {orderedIds.map((presetId) => {
        const isDefault = defaultPresetId === presetId;
        const isActive = activePresetId === presetId;
        const label = presetLabel(presetId, userPresets);
        return (
          <span
            key={presetId}
            className={
              isActive
                ? "jl-ops-preset-chip-wrap jl-ops-preset-chip-wrap--active"
                : "jl-ops-preset-chip-wrap"
            }
            draggable
            onDragStart={(event) => handleDragStart(event, presetId)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={(event) => handleDrop(event, presetId)}
          >
            <button
              type="button"
              className={
                isActive
                  ? "jl-ops-preset-chip jl-ops-preset-chip--active"
                  : "jl-ops-preset-chip"
              }
              aria-pressed={isActive}
              onClick={() => {
                if (dragActiveRef.current) return;
                onSelectPreset(presetId);
              }}
            >
              {label}
            </button>
            <button
              type="button"
              className={
                isDefault
                  ? "jl-ops-preset-star jl-ops-preset-star--active"
                  : "jl-ops-preset-star"
              }
              draggable={false}
              aria-label={
                isDefault
                  ? `${label} is default`
                  : `Set ${label} as default`
              }
              aria-pressed={isDefault}
              onClick={(event) => {
                event.stopPropagation();
                onSetDefault(presetId);
              }}
            >
              {isDefault ? "★" : "☆"}
            </button>
          </span>
        );
      })}
      <span className="jl-ops-preset-manage-anchor">
        <button
          type="button"
          className="jl-ops-preset-chip"
          aria-expanded={manageOpen}
          aria-haspopup="menu"
          onClick={() => setManageOpen((open) => !open)}
        >
          Manage
        </button>
        {manageOpen ? (
          <AdminPresetManageMenu
            orderedIds={orderedIds}
            defaultPresetId={defaultPresetId}
            userPresets={userPresets}
            onSetDefault={onSetDefault}
            onReorderPresets={(next) => {
              onReorderPresets(next);
            }}
            onRenameUserPreset={onRenameUserPreset}
            onDeleteUserPreset={onDeleteUserPreset}
            onDismiss={() => setManageOpen(false)}
          />
        ) : null}
      </span>
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
