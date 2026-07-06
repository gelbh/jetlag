import type { ReactNode } from "react";
import type { MapStyle } from "../../domain/mapBasemaps";
import {
  MAP_TOOL_DOCK_ENTRIES,
  isMarkupDockTool,
  mapToolDockMenuHint,
  mapToolDockMenuLabel,
} from "../../domain/mapTools";
import type { MapTool } from "../../state/sessionStore";
import { useScrollLock } from "../../hooks/useScrollLock";
import { MobileSheet } from "../ui/MobileSheet";
import {
  HudLayersIcon,
  HudPinIcon,
  HudRedoIcon,
  HudSettingsIcon,
  HudUndoIcon,
  HudZoneIcon,
} from "../ui/HudIcons";

interface ToolOverflowSheetProps {
  open: boolean;
  onClose: () => void;
  activeTool: MapTool;
  onSelect: (tool: MapTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenSettings: () => void;
  onOpenChat?: () => void;
  mapStyle?: MapStyle;
  onMapStyleChange?: (style: MapStyle) => void;
}

const markupTools = MAP_TOOL_DOCK_ENTRIES.filter((tool) =>
  isMarkupDockTool(tool.id),
);

interface ToolOverflowRowProps {
  icon: ReactNode;
  title: string;
  hint?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel: string;
}

function ToolOverflowRow({
  icon,
  title,
  hint,
  active = false,
  disabled = false,
  onClick,
  ariaLabel,
}: ToolOverflowRowProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`jl-tool-overflow-row ${active ? "jl-tool-overflow-row-active" : ""}`}
    >
      <span className="jl-tool-overflow-row-icon">{icon}</span>
      <span className="jl-tool-overflow-row-text">
        <span className="font-display text-sm font-semibold uppercase tracking-wide">
          {title}
        </span>
        {hint ? (
          <span className="text-xs leading-snug text-ink-muted">{hint}</span>
        ) : null}
      </span>
    </button>
  );
}

function ToolOverflowOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[var(--z-modal)] overscroll-contain hud-scrim hud-scrim-enter"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <div onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>
  );
}

export function ToolOverflowSheet({
  open,
  onClose,
  activeTool,
  onSelect,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenSettings,
  onOpenChat,
  mapStyle,
  onMapStyleChange,
}: ToolOverflowSheetProps) {
  useScrollLock(open);

  if (!open) {
    return null;
  }

  const nextMapStyle = mapStyle === "standard" ? "satellite" : "standard";
  const mapStyleLabel =
    mapStyle === "standard" ? "Satellite view" : "Map view";
  const mapStyleHint =
    mapStyle === "standard"
      ? "Switch to satellite imagery"
      : "Switch to standard map tiles";

  const closeAnd = (action: () => void) => {
    action();
    onClose();
  };

  const selectTool = (tool: MapTool) => {
    onSelect(activeTool === tool ? "none" : tool);
    onClose();
  };

  return (
    <ToolOverflowOverlay onClose={onClose}>
      <MobileSheet
        className="hud-sheet-enter"
        maxHeightClassName="max-h-[min(50dvh,420px)]"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More tools"
          className="space-y-0"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight text-ink">
              More tools
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary min-h-10 px-4 text-xs"
            >
              Close
            </button>
          </div>

          {markupTools.map((tool) => {
            const hint = mapToolDockMenuHint(tool);
            const active = activeTool === tool.id;
            const icon =
              tool.id === "zone" ? (
                <HudZoneIcon className="h-5 w-5" />
              ) : (
                <HudPinIcon className="h-5 w-5" />
              );

            return (
              <ToolOverflowRow
                key={tool.id}
                icon={icon}
                title={mapToolDockMenuLabel(tool)}
                hint={hint ?? undefined}
                active={active}
                disabled={!tool.enabled}
                onClick={() => selectTool(tool.id)}
                ariaLabel={tool.name}
              />
            );
          })}

          <div className="jl-tool-overflow-divider" aria-hidden="true" />

          {mapStyle && onMapStyleChange ? (
            <ToolOverflowRow
              icon={<HudLayersIcon className="h-5 w-5" />}
              title={mapStyleLabel}
              hint={mapStyleHint}
              active={mapStyle === "satellite"}
              onClick={() => closeAnd(() => onMapStyleChange(nextMapStyle))}
              ariaLabel={mapStyleLabel}
            />
          ) : null}

          {onOpenChat ? (
            <ToolOverflowRow
              icon={
                <span className="text-sm font-bold" aria-hidden="true">
                  @
                </span>
              }
              title="Chat"
              hint="Game and social messages"
              onClick={() => closeAnd(onOpenChat)}
              ariaLabel="Open chat"
            />
          ) : null}

          <ToolOverflowRow
            icon={<HudSettingsIcon className="h-5 w-5" />}
            title="Setup"
            hint="Session settings and layers"
            onClick={() => closeAnd(onOpenSettings)}
            ariaLabel="Open settings"
          />

          <div className="jl-tool-overflow-divider" aria-hidden="true" />

          <ToolOverflowRow
            icon={<HudUndoIcon className="h-5 w-5" />}
            title="Undo"
            hint="Remove last annotation"
            disabled={!canUndo}
            onClick={() => closeAnd(onUndo)}
            ariaLabel="Undo last annotation"
          />

          <ToolOverflowRow
            icon={<HudRedoIcon className="h-5 w-5" />}
            title="Redo"
            hint="Restore last undone annotation"
            disabled={!canRedo}
            onClick={() => closeAnd(onRedo)}
            ariaLabel="Redo last annotation"
          />
        </div>
      </MobileSheet>
    </ToolOverflowOverlay>
  );
}
