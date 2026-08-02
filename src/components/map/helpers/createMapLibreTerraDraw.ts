import type { Feature, LineString, Point, Polygon } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";
import {
  TerraDraw,
  TerraDrawLineStringMode,
  TerraDrawPointMode,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";

/**
 * Draw library choice (Slice 4): `terra-draw` + `terra-draw-maplibre-gl-adapter`.
 *
 * Why not `@mapbox/mapbox-gl-draw`: MapLibre GL v5+ mobile touch crashes (third-arg
 * `map.on` options misparsed as layerIds), plus CSS-class / dasharray friction on
 * MapLibre. Terra Draw is MapLibre-native and round-trips GeoJSON via
 * `addFeatures` / `getSnapshot`. Prefer the core + adapter over
 * `@watergis/maplibre-gl-terradraw` — we need programmatic GeoJSON, not their
 * toolbar chrome.
 */
export type MapLibreDrawGeometry = Point | LineString | Polygon;

export type MapLibreDrawMode = "point" | "linestring" | "polygon" | "select";

export interface MapLibreTerraDrawHandle {
  start: () => void;
  stop: () => void;
  setMode: (mode: MapLibreDrawMode) => void;
  /** Replace store contents with GeoJSON features (mode stamped for Terra Draw). */
  setFeatures: (
    features: readonly Feature<MapLibreDrawGeometry>[],
    mode: Exclude<MapLibreDrawMode, "select">,
  ) => void;
  /** Snapshot store as plain GeoJSON features (ids/mode properties stripped). */
  getFeatures: () => Feature<MapLibreDrawGeometry>[];
  clear: () => void;
  destroy: () => void;
  /** Underlying Terra Draw instance for advanced listeners. */
  draw: TerraDraw;
}

function stripDrawProperties(
  feature: GeoJSONStoreFeatures,
): Feature<MapLibreDrawGeometry> {
  const { mode: _mode, ...rest } = feature.properties ?? {};
  void _mode;
  return {
    type: "Feature",
    id: feature.id,
    properties: rest,
    geometry: feature.geometry as MapLibreDrawGeometry,
  };
}

export function toTerraDrawFeatures(
  features: readonly Feature<MapLibreDrawGeometry>[],
  mode: Exclude<MapLibreDrawMode, "select">,
): GeoJSONStoreFeatures[] {
  return features.map((feature) => ({
    type: "Feature",
    ...(feature.id != null ? { id: feature.id } : {}),
    properties: {
      ...(feature.properties ?? {}),
      mode,
    },
    geometry: feature.geometry,
  })) as GeoJSONStoreFeatures[];
}

export function fromTerraDrawSnapshot(
  features: readonly GeoJSONStoreFeatures[],
): Feature<MapLibreDrawGeometry>[] {
  return features.map(stripDrawProperties);
}

/** Terra Draw mutators require an enabled instance — start lazily if needed. */
export function ensureTerraDrawStarted(draw: {
  enabled: boolean;
  start: () => void;
}): void {
  if (!draw.enabled) {
    draw.start();
  }
}

export function createMapLibreTerraDraw(map: MapLibreMap): MapLibreTerraDrawHandle {
  const draw = new TerraDraw({
    adapter: new TerraDrawMapLibreGLAdapter({ map }),
    modes: [
      new TerraDrawPointMode(),
      new TerraDrawLineStringMode(),
      new TerraDrawPolygonMode(),
      new TerraDrawSelectMode(),
    ],
  });

  return {
    draw,
    start: () => {
      draw.start();
    },
    stop: () => {
      draw.stop();
    },
    setMode: (mode) => {
      ensureTerraDrawStarted(draw);
      draw.setMode(mode);
    },
    setFeatures: (features, mode) => {
      ensureTerraDrawStarted(draw);
      draw.clear();
      const prepared = toTerraDrawFeatures(features, mode);
      if (prepared.length > 0) {
        draw.addFeatures(prepared);
      }
    },
    getFeatures: () => fromTerraDrawSnapshot(draw.getSnapshot()),
    clear: () => {
      ensureTerraDrawStarted(draw);
      draw.clear();
    },
    destroy: () => {
      if (draw.enabled) {
        draw.stop();
      }
    },
  };
}
