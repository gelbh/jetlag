import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  CUSTOM_PRESET_ID,
  movePresetOntoId,
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
    (id) => id === CUSTOM_PRESET_ID || userIds.has(id),
  );
  const [manageOpen, setManageOpen] = useState(false);
  const [managePos, setManagePos] = useState<{ left: number; top: number } | null>(
    null,
  );
  const manageAnchorRef = useRef<HTMLSpanElement>(null);
  const manageTriggerRef = useRef<HTMLButtonElement>(null);
  const managePanelRef = useRef<HTMLDivElement>(null);
  const dragFromIdRef = useRef<string | null>(null);

  const closeManage = () => {
    setManageOpen(false);
    setManagePos(null);
    manageTriggerRef.current?.focus();
  };

  useEffect(() => {
    if (!manageOpen) return;
    const updatePos = () => {
      const trigger = manageTriggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = 16 * 16; // min-width 16rem ≈ clamp left
      const left = Math.max(
        8,
        Math.min(rect.left, window.innerWidth - width - 8),
      );
      setManagePos({ left, top: rect.bottom + 4 });
    };
    updatePos();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeManage();
    };
    const onPointer = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (manageAnchorRef.current?.contains(event.target)) return;
      if (managePanelRef.current?.contains(event.target)) return;
      closeManage();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
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
    const next = movePresetOntoId(orderedIds, fromId, targetId);
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
          onClick={() => {
            if (manageOpen) {
              closeManage();
              return;
            }
            const trigger = manageTriggerRef.current;
            if (trigger) {
              const rect = trigger.getBoundingClientRect();
              const width = 16 * 16;
              setManagePos({
                left: Math.max(
                  8,
                  Math.min(rect.left, window.innerWidth - width - 8),
                ),
                top: rect.bottom + 4,
              });
            }
            setManageOpen(true);
          }}
        >
          Manage
        </button>
        {manageOpen && managePos ? (
          <AdminPresetManageMenu
            orderedIds={orderedIds}
            defaultPresetId={defaultPresetId}
            userPresets={userPresets}
            onSetDefault={onSetDefault}
            onReorderPresets={onReorderPresets}
            onRenameUserPreset={onRenameUserPreset}
            onDeleteUserPreset={onDeleteUserPreset}
            onDismiss={closeManage}
            panelRef={managePanelRef}
            style={{
              position: "fixed",
              left: managePos.left,
              top: managePos.top,
              zIndex: 40,
            }}
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
