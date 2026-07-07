import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";
import type { LayerVisibility } from "../../state/sessionStore";

const LAYER_ITEMS: ReadonlyArray<{
  key: keyof LayerVisibility;
  label: string;
  color: string;
}> = [
  { key: "radar", label: "Radar", color: MAP_ANNOTATION_COLORS.radar },
  {
    key: "thermometer",
    label: "Thermometer",
    color: MAP_ANNOTATION_COLORS.elimination,
  },
  {
    key: "measuring",
    label: "Measuring",
    color: MAP_ANNOTATION_COLORS.measuring,
  },
  {
    key: "matching",
    label: "Matching",
    color: MAP_ANNOTATION_COLORS.elimination,
  },
  { key: "zone", label: "Zone", color: MAP_ANNOTATION_COLORS.zone },
  { key: "pin", label: "Pin", color: MAP_ANNOTATION_COLORS.pin },
  { key: "tentacle", label: "Tentacle", color: MAP_ANNOTATION_COLORS.tentacle },
  {
    key: "transit",
    label: "Transit",
    color: MAP_ANNOTATION_COLORS.transit.metro,
  },
];

interface LayerVisibilityGridProps {
  layerVisibility: LayerVisibility;
  onLayerVisibilityChange: (
    layer: keyof LayerVisibility,
    visible: boolean,
  ) => void;
}

export function LayerVisibilityGrid({
  layerVisibility,
  onLayerVisibilityChange,
}: LayerVisibilityGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {LAYER_ITEMS.map(({ key, label, color }) => (
        <label
          key={key}
          className="jl-toggle-row text-sm"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span className="truncate font-display text-xs font-semibold uppercase tracking-wide">
              {label}
            </span>
          </span>
          <input
            type="checkbox"
            checked={layerVisibility[key]}
            onChange={(event) =>
              onLayerVisibilityChange(key, event.target.checked)
            }
            className="h-5 w-5 shrink-0 accent-action"
          />
        </label>
      ))}
    </div>
  );
}
