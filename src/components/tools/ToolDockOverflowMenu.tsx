import { PencilSimpleIcon, BoundingBoxIcon, MapPinIcon } from "@phosphor-icons/react";
import type { MapTool } from "../../state/sessionStore";
import {
  MAP_TOOL_DOCK_ENTRIES,
  isMarkupDockTool,
  mapToolDockMenuHint,
  mapToolDockMenuLabel,
} from "../../domain/map/mapTools";
import { cn } from "../../lib/cn";
import { JlIcon } from "../ui/brand/JlIcon";
import { SheetHost } from "../ui/sheets/SheetHost";

const markupTools = MAP_TOOL_DOCK_ENTRIES.filter((tool) =>
  isMarkupDockTool(tool.id),
);

const MARKUP_ICONS = {
  zone: BoundingBoxIcon,
  pin: MapPinIcon,
  draw: PencilSimpleIcon,
} as const;

interface ToolDockDrawMenuProps {
  open: boolean;
  activeTool: MapTool;
  onSelect: (tool: MapTool) => void;
  onClose: () => void;
}

/** iOS bottom action sheet for Zone / Pin / Freehand. */
export function ToolDockDrawMenu({
  open,
  activeTool,
  onSelect,
  onClose,
}: ToolDockDrawMenuProps) {
  return (
    <SheetHost
      open={open}
      onClose={onClose}
      ariaLabel="Draw on map"
      maxHeightClassName="max-h-[min(50dvh,24rem)]"
      pinned={
        <h2 className="text-[1.25rem] font-bold tracking-tight text-field-ink">
          Draw on map
        </h2>
      }
    >
      <div className="flex flex-col gap-1" role="menu" aria-label="Draw on map">
        {markupTools.map((tool) => {
          const hint = mapToolDockMenuHint(tool);
          const active = activeTool === tool.id;
          if (!isMarkupDockTool(tool.id)) {
            return null;
          }
          const Icon = MARKUP_ICONS[tool.id];

          return (
            <button
              key={tool.id}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              aria-disabled={!tool.enabled}
              disabled={!tool.enabled}
              onClick={() => {
                if (!tool.enabled) {
                  return;
                }
                onSelect(tool.id);
                onClose();
              }}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                active
                  ? "bg-highlight-soft text-highlight"
                  : "bg-transparent text-field-ink hover:bg-surface-raised/80",
                !tool.enabled && "opacity-40",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised/90">
                <JlIcon
                  icon={Icon}
                  size={22}
                  weight={active ? "bold" : "regular"}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem] font-semibold tracking-tight">
                  {mapToolDockMenuLabel(tool)}
                </span>
                {hint ? (
                  <span
                    className={cn(
                      "mt-0.5 block text-xs leading-snug",
                      active ? "text-highlight/80" : "text-field-ink-muted",
                    )}
                  >
                    {hint}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </SheetHost>
  );
}
