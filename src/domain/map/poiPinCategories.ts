import type { Point } from "geojson";
import type { LatLngTuple } from "../geometry/kernel/types";
import { BASE_MEASURING_CATALOG } from "../questions/measuring/measuringCatalog";
import type { AnnotationRecord } from "./annotations";

type PointMeasuringOption = Extract<
  (typeof BASE_MEASURING_CATALOG)[number],
  { targetKind: "point" }
>;

export type PoiPinCategoryId = Exclude<PointMeasuringOption["id"], "body_of_water">;

/** Point POIs a pin can stand in for; the Measuring catalog covers every Tentacle and Matching point id. */
export const POI_PIN_CATEGORIES: readonly { id: PoiPinCategoryId; label: string }[] =
  BASE_MEASURING_CATALOG.filter(
    (option): option is Extract<PointMeasuringOption, { id: PoiPinCategoryId }> =>
      option.targetKind === "point" && option.id !== "body_of_water",
  ).map(({ id, label }) => ({ id, label }));

export function poiPinsForCategory(
  annotations: readonly AnnotationRecord[],
  categoryId: string,
): { id: string; name: string; point: LatLngTuple }[] {
  return annotations
    .filter(
      (annotation) =>
        annotation.type === "pin" &&
        annotation.status === "active" &&
        annotation.metadata.poiCategory === categoryId &&
        annotation.geometry.geometry.type === "Point",
    )
    .map((annotation) => {
      const [lng, lat] = (annotation.geometry.geometry as Point).coordinates;
      return { id: annotation.id, name: annotation.metadata.label ?? "Pin", point: [lat, lng] };
    });
}
