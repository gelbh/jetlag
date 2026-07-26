import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  BUILTIN_PRESETS,
  CUSTOM_PRESET_ID,
  movePresetToIndex,
  presetLabel,
  type DeskPreset,
} from "../../domain/admin/opsDeskLayout";
import { AdminPresetManageMenu } from "./AdminPresetManageMenu";

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
  const manageAnchorRef = useRef<HTMLSpanElement>(null);
  const manageTriggerRef = useRef<HTMLButtonElement>(null);
  const dragFromIdRef = useRef<string | null>(null);

  const closeManage = () => {
    setManageOpen(false);
    manageTriggerRef.current?.focus();
  };

  useEffect(() => {
    if (!manageOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeManage();
    };
    const onPointer = (event: MouseEvent) => {
      const root = manageAnchorRef.current;
      if (!root || !(event.target instanceof Node)) return;
      if (root.contains(event.target)) return;
      closeManage();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [manageOpen]);

  const handleDragStart = (event: DragEvent, presetId: string) => {
    dragFromIdRef.current = presetId;
    event.dataTransfer.setData(PRESET_MIME, presetId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    dragFromIdRef.current = null;
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
    const toIndex = orderedIds.indexOf(targetId);
    const next = movePresetToIndex(orderedIds, fromId, toIndex);
    if (next) onReorderPresets(next);
  };

  return (
    <div className="jl-ops-preset-row" data-testid="admin-ops-presets">
      {orderedIds.map((presetId) => {
        const isDefault = defaultPresetId === presetId;
        const isActive = activePresetId === presetId;
        const label = presetLabel(presetId, userPresets);
        const wrapClass = isActive
          ? "jl-ops-preset-chip-wrap jl-ops-preset-chip-wrap--active"
          : "jl-ops-preset-chip-wrap";
        return (
          <span
            key={presetId}
            className={wrapClass}
            onDragOver={handleDragOver}
            onDrop={(event) => handleDrop(event, presetId)}
          >
            <button
              type="button"
              className="jl-ops-preset-drag jl-ops-drag-handle"
              draggable
              aria-hidden="true"
              tabIndex={-1}
              onDragStart={(event) => handleDragStart(event, presetId)}
              onDragEnd={handleDragEnd}
            >
              ⠿
            </button>
            <button
              type="button"
              className="jl-ops-preset-chip"
              aria-pressed={isActive}
              onClick={() => onSelectPreset(presetId)}
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
              aria-label={
                isDefault
                  ? `${label} is default`
                  : `Set ${label} as default`
              }
              aria-pressed={isDefault}
              onClick={() => onSetDefault(presetId)}
            >
              {isDefault ? "★" : "☆"}
            </button>
          </span>
        );
      })}
      <span className="jl-ops-preset-manage-anchor" ref={manageAnchorRef}>
        <button
          type="button"
          ref={manageTriggerRef}
          className="jl-ops-preset-chip"
          aria-expanded={manageOpen}
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
            onReorderPresets={onReorderPresets}
            onRenameUserPreset={onRenameUserPreset}
            onDeleteUserPreset={onDeleteUserPreset}
            onDismiss={closeManage}
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
