import { mapToolPlacingLabel } from "../../domain/mapTools";
import type { MapTool } from "../../state/sessionStore";

interface MapModeChipProps {
  activeTool: MapTool;
}

export function MapModeChip({ activeTool }: MapModeChipProps) {
  const placing = activeTool !== "none";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[1001] px-3">
      <div
        className={`mx-auto w-fit rounded-full border px-4 py-2 text-sm font-medium backdrop-blur ${
          placing
            ? "border-sky-400/50 bg-sky-500/20 text-sky-100"
            : "border-slate-600 bg-slate-950/85 text-slate-200"
        }`}
      >
        {placing
          ? `Placing: ${mapToolPlacingLabel(activeTool)}`
          : "Select: tap a marker to edit"}
      </div>
    </div>
  );
}
