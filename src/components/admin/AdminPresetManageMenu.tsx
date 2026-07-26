import { useEffect, useRef, type RefObject } from "react";
import {
  BUILTIN_PRESETS,
  CUSTOM_PRESET_ID,
  type DeskPreset,
} from "../../domain/admin/opsDeskLayout";

export function presetLabel(id: string, userPresets: DeskPreset[]): string {
  if (id === CUSTOM_PRESET_ID) return "Custom";
  const builtin = BUILTIN_PRESETS.find((p) => p.id === id);
  if (builtin) return builtin.name;
  return userPresets.find((p) => p.id === id)?.name ?? id;
}

export function movePresetOrder(
  orderedIds: string[],
  id: string,
  delta: number,
): string[] | null {
  const index = orderedIds.indexOf(id);
  if (index < 0) return null;
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= orderedIds.length) return null;
  const next = [...orderedIds];
  const [item] = next.splice(index, 1);
  if (!item) return null;
  next.splice(nextIndex, 0, item);
  return next;
}

interface AdminPresetManageMenuProps {
  orderedIds: readonly string[];
  defaultPresetId: string;
  userPresets: DeskPreset[];
  onSetDefault: (presetId: string) => void;
  onReorderPresets: (orderedIds: string[]) => void;
  onRenameUserPreset: (presetId: string) => void;
  onDeleteUserPreset: (presetId: string) => void;
  onDismiss: () => void;
  /** Keep Manage toggle clicks from counting as outside dismiss. */
  dismissIgnoreRef?: RefObject<HTMLElement | null>;
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
  dismissIgnoreRef,
}: AdminPresetManageMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const userIds = new Set(userPresets.map((p) => p.id));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    const onPointer = (event: MouseEvent) => {
      const root = rootRef.current;
      if (!root || !(event.target instanceof Node)) return;
      if (root.contains(event.target)) return;
      if (dismissIgnoreRef?.current?.contains(event.target)) return;
      onDismiss();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [onDismiss, dismissIgnoreRef]);

  return (
    <div
      ref={rootRef}
      className="jl-ops-preset-manage hud-panel"
      data-testid="admin-ops-preset-manage"
      role="menu"
      aria-label="Manage presets"
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
                  role="menuitem"
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
                  role="menuitem"
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
                  role="menuitem"
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
                      role="menuitem"
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
                      role="menuitem"
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
