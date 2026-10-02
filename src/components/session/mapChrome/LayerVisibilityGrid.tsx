import { Box } from "@mantine/core";
import { InsetGroup } from "@/components/ui/entry/entryChrome";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import type { LayerVisibility } from "@/state/sessionStore";
import { SettingsToggleRow } from "../settings/SettingsToggleRow";

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
  { key: "draw", label: "Freehand", color: MAP_ANNOTATION_COLORS.draw },
  { key: "tentacle", label: "Tentacle", color: MAP_ANNOTATION_COLORS.tentacle },
  {
    key: "transit",
    label: "Transit",
    color: MAP_ANNOTATION_COLORS.transit.metro,
  },
];

interface LayerVisibilityGridProps {
  layerVisibility: LayerVisibility;
  onLayerVisibilityChange: (layer: keyof LayerVisibility, visible: boolean) => void;
}

export function LayerVisibilityGrid({
  layerVisibility,
  onLayerVisibilityChange,
}: LayerVisibilityGridProps) {
  return (
    <InsetGroup>
      {LAYER_ITEMS.map(({ key, label, color }, index) => (
        <SettingsToggleRow
          key={key}
          showSeparator={index > 0}
          label={label}
          checked={layerVisibility[key]}
          onChange={(visible) => onLayerVisibilityChange(key, visible)}
          leading={
            <Box
              style={{
                width: "0.625rem",
                height: "0.625rem",
                borderRadius: 2,
                backgroundColor: color,
              }}
            />
          }
        />
      ))}
    </InsetGroup>
  );
}
