import type { Map as MapLibreMap } from "maplibre-gl";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { haversineMeters } from "@/domain/geometry/gameArea/distance";
import type { MapStyle } from "@/domain/map/mapBasemaps";
import type { PoiCandidate } from "@/domain/geo/poiCandidate";
import {
  isBasemapPoiQueryAvailable,
  queryBasemapPois,
  type QueryBasemapPoisOptions,
} from "@/services/geo/maplibre/basemapPoiQuery";
import { getRegisteredMapLibreMap } from "@/services/geo/maplibre/mapLibreMapRegistry";

export interface PreviewBasemapPoisOptions extends QueryBasemapPoisOptions {
  mapStyle: MapStyle;
  map?: MapLibreMap | null;
  /** When set with category preview, drop candidates farther than this from the point. */
  maxDistanceMeters?: number;
}

/**
 * Street-only tile preview. Satellite / missing map → []. Never scored SoT.
 */
export function previewBasemapPois(
  opts: PreviewBasemapPoisOptions,
): PoiCandidate[] {
  if (!isBasemapPoiQueryAvailable(opts.mapStyle)) {
    return [];
  }
  const map = opts.map ?? getRegisteredMapLibreMap();
  if (!map) {
    return [];
  }

  try {
    let candidates = queryBasemapPois(map, {
      categoryIds: opts.categoryIds,
      point: opts.point,
      maxResults: opts.maxResults,
    });

    if (opts.maxDistanceMeters != null && opts.point) {
      const origin = opts.point;
      const max = opts.maxDistanceMeters;
      candidates = candidates.filter(
        (c) => haversineMeters(origin, c.point) <= max,
      );
    }

    return candidates;
  } catch {
    return [];
  }
}

export function satelliteBasemapPoiUnavailableMessage(): string {
  return "Map place hints are unavailable on satellite. Switch to Map or search by name.";
}

export type { LatLngTuple };
