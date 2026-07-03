import { mapToolPlacingLabel } from "../../domain/mapTools";
import type { MapTool } from "../../state/sessionStore";

interface MapModeChipProps {
  activeTool: MapTool;
}

export function MapModeChip({ activeTool }: MapModeChipProps) {
  const placing = activeTool !== "none";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[var(--z-banner)] px-3">
      <div
        className={`mx-auto w-fit rounded-full border px-4 py-2 text-sm font-medium ${
          placing
            ? "border-action/50 bg-action-soft text-status-info"
            : "border-border bg-surface-panel text-ink-secondary"
        }`}
      >
        {placing
          ? `Placing: ${mapToolPlacingLabel(activeTool)}`
          : "Select: tap a marker to edit"}
      </div>
    </div>
  );
}
