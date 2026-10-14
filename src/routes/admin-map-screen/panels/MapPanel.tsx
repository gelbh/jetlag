import { Button, Group, Stack, Switch, Title } from "@mantine/core";
import type { MapViewportState } from "@/components/map/chrome/MapViewportTracker";
import { LayerVisibilityGrid } from "@/components/session/mapChrome/LayerVisibilityGrid";
import type { MapStyle } from "@/domain/map/mapBasemaps";
import type { LayerVisibility } from "@/state/sessionStore";
import { AdminDiagRow } from "../../../components/admin/shared/AdminDiagRow";

interface MapPanelProps {
  mapViewport: MapViewportState | null;
  layerVisibility: LayerVisibility;
  effectiveBasemapStyle: MapStyle;
  lowPowerMode: boolean;
  onLayerVisibilityChange: (layer: keyof LayerVisibility, visible: boolean) => void;
  onMapStyleChange: (style: MapStyle) => void;
  onLowPowerModeChange: (enabled: boolean) => void;
}

const BASEMAPS: Array<{ style: MapStyle; label: string }> = [
  { style: "standard", label: "Standard" },
  { style: "satellite", label: "Satellite" },
];

function formatBounds(mapViewport: MapViewportState | null): string {
  if (!mapViewport) {
    return "—";
  }

  const { bounds, zoom } = mapViewport;
  return `z${zoom.toFixed(1)} · ${bounds.south.toFixed(3)},${bounds.west.toFixed(3)} → ${bounds.north.toFixed(3)},${bounds.east.toFixed(3)}`;
}

export function MapPanel({
  mapViewport,
  layerVisibility,
  effectiveBasemapStyle,
  lowPowerMode,
  onLayerVisibilityChange,
  onMapStyleChange,
  onLowPowerModeChange,
}: MapPanelProps) {
  return (
    <Stack gap="md">
      <Stack component="section" aria-label="Map viewport" gap="xs">
        <Title order={3} size="sm">
          Viewport
        </Title>
        <Stack component="dl" gap="xs" m={0}>
          <AdminDiagRow label="Bounds">{formatBounds(mapViewport)}</AdminDiagRow>
          <AdminDiagRow label="Basemap">{effectiveBasemapStyle}</AdminDiagRow>
        </Stack>
      </Stack>

      <Stack component="section" aria-label="Basemap and power" gap="xs">
        <Title order={3} size="sm">
          Display
        </Title>
        <Group gap="xs">
          {BASEMAPS.map(({ style, label }) => (
            <Button
              key={style}
              size="xs"
              variant={effectiveBasemapStyle === style ? "filled" : "default"}
              aria-pressed={effectiveBasemapStyle === style}
              onClick={() => onMapStyleChange(style)}
            >
              {label}
            </Button>
          ))}
        </Group>
        <Switch
          label="Low power mode"
          checked={lowPowerMode}
          onChange={(event) => onLowPowerModeChange(event.currentTarget.checked)}
        />
      </Stack>

      <Stack component="section" aria-label="Layer visibility" gap="xs">
        <Title order={3} size="sm">
          Layers
        </Title>
        <LayerVisibilityGrid
          layerVisibility={layerVisibility}
          onLayerVisibilityChange={onLayerVisibilityChange}
        />
      </Stack>
    </Stack>
  );
}
