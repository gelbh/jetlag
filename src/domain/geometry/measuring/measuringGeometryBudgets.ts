import type { Feature, MultiPolygon, Polygon } from "geojson";
import { persistSlimPolygonFeature } from "../progressive/persistSlim";
import {
  POLYGON_PERSIST_MAX_JSON_CHARS,
  POLYGON_PERSIST_MAX_VERTICES,
} from "../progressive/polygonMetrics";

export const MEASURING_OUTPUT_MAX_VERTICES = POLYGON_PERSIST_MAX_VERTICES;
export const MEASURING_OUTPUT_MAX_JSON_CHARS = POLYGON_PERSIST_MAX_JSON_CHARS;

export const MEASURING_PERSIST_OVER_BUDGET_MESSAGE =
  "Couldn't save this measure — geometry is too large to store. Try a shorter distance.";

export type MeasuringOutputSoftenResult =
  | { ok: true; feature: Feature<Polygon | MultiPolygon> }
  | { ok: false; message: string };

export function persistSlimMeasuringGeometry(
  feature: Feature<Polygon | MultiPolygon>,
): MeasuringOutputSoftenResult {
  const result = persistSlimPolygonFeature(feature);
  if (!result.ok) {
    return { ok: false, message: MEASURING_PERSIST_OVER_BUDGET_MESSAGE };
  }
  return result;
}
