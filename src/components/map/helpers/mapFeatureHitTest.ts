import type { MapGeoJSONFeature, Map as MapLibreMap } from "maplibre-gl";
import { isJlMarkerLayerId } from "./mapMarkerConstants";

export interface MapFeatureHitResult {
  feature: MapGeoJSONFeature;
  layerId: string;
  lngLat: import("maplibre-gl").LngLat;
}

export type MapFeatureHitHandler = (
  result: MapFeatureHitResult,
) => boolean | void;

export function queryJlMarkerFeatures(
  map: MapLibreMap,
  point: { x: number; y: number },
): MapFeatureHitResult | null {
  const style = map.getStyle();
  if (!style?.layers) {
    return null;
  }

  const markerLayerIds = style.layers
    .map((layer) => layer.id)
    .filter(isJlMarkerLayerId);

  if (markerLayerIds.length === 0) {
    return null;
  }

  const features = map.queryRenderedFeatures([point.x, point.y], {
    layers: markerLayerIds,
  });

  const top = features[0];
  if (!top?.layer?.id) {
    return null;
  }

  return {
    feature: top,
    layerId: top.layer.id,
    lngLat: map.unproject([point.x, point.y]),
  };
}

export function dispatchMapFeatureHit(
  registry: {
    byHitId: ReadonlyMap<string, MapFeatureHitHandler>;
    byLayerPrefix: ReadonlyMap<string, MapFeatureHitHandler>;
  },
  result: MapFeatureHitResult,
): boolean {
  const hitId = featureHitId(result.feature);
  if (hitId) {
    const byId = registry.byHitId.get(hitId);
    if (byId) {
      return byId(result) !== false;
    }
  }

  for (const [prefix, handler] of registry.byLayerPrefix) {
    if (result.layerId.startsWith(prefix)) {
      return handler(result) !== false;
    }
  }
  return false;
}

export function featureHitId(feature: MapGeoJSONFeature): string | null {
  const props = feature.properties;
  if (props == null) {
    return null;
  }
  const hitId = props.hitId;
  return typeof hitId === "string" ? hitId : null;
}

export function featureHitKind(feature: MapGeoJSONFeature): string | null {
  const props = feature.properties;
  if (props == null) {
    return null;
  }
  const hitKind = props.hitKind;
  return typeof hitKind === "string" ? hitKind : null;
}
