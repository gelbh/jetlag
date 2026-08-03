import type { Feature, FeatureCollection, Point } from "geojson";

/** Standard circle-marker feature properties for data-driven GL paint. */
export interface CircleMarkerProps {
  id: string;
  lat: number;
  lng: number;
  radiusPx: number;
  fillColor: string;
  borderColor: string;
  borderWidth?: number;
  opacity?: number;
  /** Hit-test dispatch key (e.g. stop id, overlay id). */
  hitId?: string;
  hitKind?: string;
}

export function circleMarkerFeature(props: CircleMarkerProps): Feature<Point> {
  return {
    type: "Feature",
    id: props.id,
    properties: {
      hitId: props.hitId ?? props.id,
      hitKind: props.hitKind ?? "circle",
      radiusPx: props.radiusPx,
      fillColor: props.fillColor,
      borderColor: props.borderColor,
      borderWidth: props.borderWidth ?? 2,
      opacity: props.opacity ?? 1,
    },
    geometry: {
      type: "Point",
      coordinates: [props.lng, props.lat],
    },
  };
}

export function circleMarkerCollection(
  markers: readonly CircleMarkerProps[],
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: markers.map(circleMarkerFeature),
  };
}

/** Symbol-marker feature properties (icon + optional text). */
export interface SymbolMarkerProps {
  id: string;
  lat: number;
  lng: number;
  iconImage?: string;
  iconRotate?: number;
  iconSize?: number;
  text?: string;
  textOffset?: [number, number];
  hitId?: string;
  hitKind?: string;
}

export function symbolMarkerFeature(
  props: SymbolMarkerProps,
): Feature<Point> {
  const textOffset = props.textOffset ?? [0, 0];
  return {
    type: "Feature",
    id: props.id,
    properties: {
      hitId: props.hitId ?? props.id,
      hitKind: props.hitKind ?? "symbol",
      iconImage: props.iconImage ?? "",
      iconRotate: props.iconRotate ?? 0,
      iconSize: props.iconSize ?? 1,
      text: props.text ?? "",
      textOffset,
    },
    geometry: {
      type: "Point",
      coordinates: [props.lng, props.lat],
    },
  };
}

export function symbolMarkerCollection(
  markers: readonly SymbolMarkerProps[],
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: markers.map(symbolMarkerFeature),
  };
}
