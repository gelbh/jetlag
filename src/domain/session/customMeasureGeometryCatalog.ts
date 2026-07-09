import type { MeasuringCatalogOption, MeasuringFromKind } from "../questions/measuringQuestions";
import type { SessionCustomMeasureGeometry } from "./customMeasureGeometry";

export function customMeasureGeometryToMeasuringOption(
  geometry: SessionCustomMeasureGeometry,
): MeasuringCatalogOption {
  return {
    id: geometry.id as MeasuringFromKind,
    groupId: "natural",
    label: geometry.label,
    promptNoun: geometry.label.startsWith("a ")
      ? geometry.label
      : `a ${geometry.label.toLowerCase()}`,
    subject: "location",
    targetKind: geometry.kind === "polygon" ? "polygon" : "linear",
    overpassSelectors: [],
    linearSelectors: [],
    supportsSearch: false,
    supportsNearest: false,
    supportsMapTarget: false,
  };
}
