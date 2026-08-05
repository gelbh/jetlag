import type { MapGeoJSONFeature, Map as MapLibreMap } from "maplibre-gl";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { haversineMeters } from "@/domain/geometry/gameArea/distance";
import type { MapStyle } from "@/domain/map/mapBasemaps";
import {
  mapOpenMapTilesPoiToCategoryIds,
  openMapTilesPoiDisplayName,
  type OpenMapTilesPoiProperties,
} from "@/domain/geo/openMapTilesPoiClassMap";
import type { PoiCandidate } from "@/domain/geo/poiCandidate";

export const OPENMAPTILES_SOURCE_ID = "openmaptiles";
export const OPENMAPTILES_POI_SOURCE_LAYER = "poi";

/** Liberty/dark rendered POI layers used when source query is empty. */
export const OPENMAPTILES_POI_RENDERED_LAYER_PREFIXES = [
  "poi_r",
  "poi_transit",
] as const;

const DEFAULT_MAX_RESULTS = 48;
const POINT_QUERY_RADIUS_METERS = 80;

export interface QueryBasemapPoisOptions {
  categoryIds?: readonly string[];
  /** When set, keep features within ~80 m of this point (tap / nearest). */
  point?: LatLngTuple;
  maxResults?: number;
}

export function isBasemapPoiQueryAvailable(mapStyle: MapStyle): boolean {
  return mapStyle !== "satellite";
}

/**
 * Query in-memory OpenFreeMap vector tiles for provisional POI candidates.
 * Satellite / missing openmaptiles source → []. Never treat results as scored SoT.
 */
export function queryBasemapPois(
  map: MapLibreMap,
  opts: QueryBasemapPoisOptions = {},
): PoiCandidate[] {
  const style = map.getStyle();
  const sources = style?.sources;
  if (!sources || !(OPENMAPTILES_SOURCE_ID in sources)) {
    return [];
  }

  const maxResults = opts.maxResults ?? DEFAULT_MAX_RESULTS;
  const categoryFilter =
    opts.categoryIds && opts.categoryIds.length > 0
      ? new Set(opts.categoryIds)
      : null;

  let features = queryPoiSourceFeatures(map);
  if (features.length === 0) {
    features = queryPoiRenderedFeatures(map, style?.layers);
  }

  const candidates: PoiCandidate[] = [];
  const seen = new Set<string>();

  for (const feature of features) {
    const candidate = featureToPoiCandidate(feature, categoryFilter, opts.point);
    if (!candidate) {
      continue;
    }
    if (seen.has(candidate.id)) {
      continue;
    }
    seen.add(candidate.id);
    candidates.push(candidate);
    if (candidates.length >= maxResults) {
      break;
    }
  }

  return candidates;
}

function queryPoiSourceFeatures(map: MapLibreMap): MapGeoJSONFeature[] {
  try {
    return map.querySourceFeatures(OPENMAPTILES_SOURCE_ID, {
      sourceLayer: OPENMAPTILES_POI_SOURCE_LAYER,
    }) as MapGeoJSONFeature[];
  } catch {
    return [];
  }
}

function queryPoiRenderedFeatures(
  map: MapLibreMap,
  layers: { id: string }[] | undefined,
): MapGeoJSONFeature[] {
  if (!layers || layers.length === 0) {
    return [];
  }
  const layerIds = layers
    .map((layer) => layer.id)
    .filter((id) =>
      OPENMAPTILES_POI_RENDERED_LAYER_PREFIXES.some(
        (prefix) => id === prefix || id.startsWith(`${prefix}`),
      ),
    );
  if (layerIds.length === 0) {
    return [];
  }
  try {
    return map.queryRenderedFeatures(undefined, {
      layers: layerIds,
    }) as MapGeoJSONFeature[];
  } catch {
    return [];
  }
}

function featureToPoiCandidate(
  feature: MapGeoJSONFeature,
  categoryFilter: Set<string> | null,
  nearPoint: LatLngTuple | undefined,
): PoiCandidate | null {
  const props = (feature.properties ?? {}) as OpenMapTilesPoiProperties;
  const name = openMapTilesPoiDisplayName(props);
  if (!name) {
    return null;
  }

  const categoryIds = mapOpenMapTilesPoiToCategoryIds(props);
  if (categoryFilter) {
    const hit = categoryIds.some((id) => categoryFilter.has(id));
    if (!hit) {
      return null;
    }
  }

  const point = geometryToLatLng(feature.geometry);
  if (!point) {
    return null;
  }

  if (nearPoint && haversineMeters(nearPoint, point) > POINT_QUERY_RADIUS_METERS) {
    return null;
  }

  const osmId = osmIdFromFeature(feature, props);
  const categoryId = categoryIds[0];
  const id =
    osmId != null
      ? `tile:${osmId}`
      : `tile:${normalizeIdPart(name)}:${point[0].toFixed(5)},${point[1].toFixed(5)}`;

  return {
    id,
    name,
    point,
    categoryId,
    source: "tile",
    confirmStatus: "provisional",
    osmId: osmId ?? undefined,
  };
}

function geometryToLatLng(
  geometry: MapGeoJSONFeature["geometry"] | null | undefined,
): LatLngTuple | null {
  if (!geometry || geometry.type !== "Point") {
    return null;
  }
  const coords = geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) {
    return null;
  }
  const lng = coords[0];
  const lat = coords[1];
  if (typeof lng !== "number" || typeof lat !== "number") {
    return null;
  }
  return [lat, lng];
}

function osmIdFromFeature(
  feature: MapGeoJSONFeature,
  props: OpenMapTilesPoiProperties,
): string | null {
  // OpenMapTiles poi: key_field osm_id with key_field_as_attribute: no → feature.id
  const fromFeatureId = coerceOsmId(feature.id);
  if (fromFeatureId) {
    return fromFeatureId;
  }
  return coerceOsmId(
    props.osm_id ?? props.osmId ?? props.id ?? props["@id"] ?? null,
  );
}

function coerceOsmId(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  return null;
}

function normalizeIdPart(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 48);
}
