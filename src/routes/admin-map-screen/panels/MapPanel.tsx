import type { MapViewportState } from "../../../components/map/MapViewportTracker";
import type { MapStyle } from "../../../domain/map/mapBasemaps";
import type { LayerVisibility } from "../../../state/sessionStore";
import { LayerVisibilityGrid } from "../../../components/session/LayerVisibilityGrid";

interface MapPanelProps {
  mapViewport: MapViewportState | null;
  layerVisibility: LayerVisibility;
  effectiveBasemapStyle: MapStyle;
  lowPowerMode: boolean;
  onLayerVisibilityChange: (
    layer: keyof LayerVisibility,
    visible: boolean,
  ) => void;
  onMapStyleChange: (style: MapStyle) => void;
  onLowPowerModeChange: (enabled: boolean) => void;
}

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
    <div className="space-y-4">
      <section aria-label="Map viewport">
        <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-ink-dim">
          Viewport
        </h3>
        <dl className="space-y-2">
          <div className="admin-diag-row">
            <dt>Bounds</dt>
            <dd>{formatBounds(mapViewport)}</dd>
          </div>
          <div className="admin-diag-row">
            <dt>Basemap</dt>
            <dd>{effectiveBasemapStyle}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Basemap and power">
        <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-ink-dim">
          Display
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`min-h-9 rounded-md px-3 text-xs font-semibold uppercase tracking-wide ${
              effectiveBasemapStyle === "standard"
                ? "bg-action text-action-ink"
                : "bg-surface-raised text-ink"
            }`}
            onClick={() => onMapStyleChange("standard")}
          >
            Standard
          </button>
          <button
            type="button"
            className={`min-h-9 rounded-md px-3 text-xs font-semibold uppercase tracking-wide ${
              effectiveBasemapStyle === "satellite"
                ? "bg-action text-action-ink"
                : "bg-surface-raised text-ink"
            }`}
            onClick={() => onMapStyleChange("satellite")}
          >
            Satellite
          </button>
        </div>
        <label className="jl-toggle-row mt-3 text-sm">
          <span className="font-display text-xs font-semibold uppercase tracking-wide">
            Low power mode
          </span>
          <input
            type="checkbox"
            checked={lowPowerMode}
            onChange={(event) => onLowPowerModeChange(event.target.checked)}
            className="h-5 w-5 accent-action"
          />
        </label>
      </section>

      <section aria-label="Layer visibility">
        <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-ink-dim">
          Layers
        </h3>
        <LayerVisibilityGrid
          layerVisibility={layerVisibility}
          onLayerVisibilityChange={onLayerVisibilityChange}
        />
      </section>
    </div>
  );
}
