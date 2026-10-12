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

export function parsePoiPinCategory(value: unknown): PoiPinCategoryId | undefined {
  return POI_PIN_CATEGORIES.find((category) => category.id === value)?.id;
}

export function poiPinCategoryLabel(value: unknown): string | undefined {
  return POI_PIN_CATEGORIES.find((category) => category.id === value)?.label;
}

export function poiPinsForCategory(
  annotations: readonly AnnotationRecord[],
  categoryId: string,
): { id: string; name: string; point: LatLngTuple }[] {
  return annotations.flatMap((annotation) => {
    const { geometry } = annotation.geometry;
    if (
      annotation.type !== "pin" ||
      annotation.status !== "active" ||
      annotation.metadata.poiCategory !== categoryId ||
      geometry.type !== "Point"
    ) {
      return [];
    }
    const [lng, lat] = geometry.coordinates;
    return [{ id: annotation.id, name: annotation.metadata.label ?? "Pin", point: [lat, lng] }];
  });
}
