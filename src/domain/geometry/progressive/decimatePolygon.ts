import type { Feature, MultiPolygon, Polygon } from "geojson";
import { countPolygonVertices } from "./polygonMetrics";

function decimateRing(ring: number[][], stride: number): number[][] {
  if (ring.length <= 4 || stride <= 1) {
    return ring;
  }
  const kept: number[][] = [];
  for (let i = 0; i < ring.length - 1; i += stride) {
    kept.push(ring[i]!);
  }
  const first = kept[0]!;
  const last = kept[kept.length - 1]!;
  if (last[0] !== first[0] || last[1] !== first[1]) {
    kept.push([...first]);
  }
  if (kept.length < 4) {
    return ring;
  }
  return kept;
}

export function decimatePolygonFeature(
  feature: Feature<Polygon | MultiPolygon>,
  maxVertices: number,
): Feature<Polygon | MultiPolygon> {
  const current = countPolygonVertices(feature);
  if (current <= maxVertices) {
    return feature;
  }
  const stride = Math.max(2, Math.ceil(current / maxVertices));
  if (feature.geometry.type === "Polygon") {
    return {
      ...feature,
      geometry: {
        type: "Polygon",
        coordinates: feature.geometry.coordinates.map((ring) =>
          decimateRing(ring, stride),
        ),
      },
    };
  }
  return {
    ...feature,
    geometry: {
      type: "MultiPolygon",
      coordinates: feature.geometry.coordinates.map((polygon) =>
        polygon.map((ring) => decimateRing(ring, stride)),
      ),
    },
  };
}
