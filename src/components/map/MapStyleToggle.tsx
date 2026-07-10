import type { MapStyle } from "../../domain/map/mapBasemaps";
import { HudLayersIcon } from "../ui/HudIcons";

interface MapStyleToggleProps {
  mapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
}

export function MapStyleToggle({
  mapStyle,
  onMapStyleChange,
}: MapStyleToggleProps) {
  const nextStyle = mapStyle === "standard" ? "satellite" : "standard";
  const label =
    mapStyle === "standard" ? "Switch to satellite view" : "Switch to map view";

  return (
    <button
      type="button"
      onClick={() => onMapStyleChange(nextStyle)}
      className="pointer-events-auto fixed z-[var(--z-dock)] hud-chrome bottom-[calc(var(--dock-total-height)+var(--chrome-gap-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] h-11 w-11 shadow-none sm:h-12 sm:w-12"
      aria-label={label}
      title={label}
    >
      <HudLayersIcon className="h-5 w-5" />
    </button>
  );
}
