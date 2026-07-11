import { resolveCustomPackMeasuringOption } from "./customQuestionPack";
import type { AnnotationRecord } from "../map/annotations";
import type { PendingQuestionRecord } from "../session/sessionChat";
import { buildCatalogHelpers } from "./catalogHelpers";
import {
  BODY_OF_WATER_MEASURING_QUESTION,
  COASTLINE_MEASURING_QUESTION,
  DEFAULT_MEASURING_FROM_KIND,
  MEASURING_CATALOG,
  MEASURE_RULE_SUMMARY,
  SEA_LEVEL_MEASURING_QUESTION,
  type MeasuringCatalogOption,
  type MeasuringFromKind,
  type MeasuringGroupId,
  type MeasuringLocationCategory,
  type MeasuringQuestionDefinition,
  type MeasuringSubject,
  type MeasuringTargetKind,
} from "./measuring/measuringCatalog";

export type {
  MeasuringAnswer,
  MeasuringCatalogOption,
  MeasuringFromKind,
  MeasuringGroupId,
  MeasuringLocationCategory,
  MeasuringQuestionDefinition,
  MeasuringSubject,
  MeasuringTargetKind,
  MeasuringTargetMode,
} from "./measuring/measuringCatalog";

export {
  BODY_OF_WATER_DEFINITION,
  BODY_OF_WATER_MEASURING_QUESTION,
  COASTLINE_DEFINITION,
  COASTLINE_MEASURING_QUESTION,
  DEFAULT_MEASURING_FROM_KIND,
  MEASURING_CATALOG,
  MEASURING_GROUPS,
  MEASURE_RULE_SUMMARY,
  SEA_LEVEL_DEFINITION,
  SEA_LEVEL_MEASURING_QUESTION,
} from "./measuring/measuringCatalog";

export function measuringCatalogOption(
  kind: MeasuringFromKind,
): MeasuringCatalogOption | undefined {
  const builtIn = MEASURING_CATALOG.find((option) => option.id === kind);
  if (builtIn) {
    return builtIn;
  }

  return resolveCustomPackMeasuringOption(kind) ?? undefined;
}

export function measuringCatalogOptionsForGroup(
  groupId: MeasuringGroupId,
): readonly MeasuringCatalogOption[] {
  return MEASURING_CATALOG.filter((option) => option.groupId === groupId);
}

export function measuringFromKind(
  subject: MeasuringSubject,
  locationCategory?: MeasuringLocationCategory | "place",
): MeasuringFromKind {
  if (subject === "coastline") {
    return "coastline";
  }

  if (subject === "sea_level") {
    return "sea_level";
  }

  if (locationCategory === "place") {
    return "custom_place";
  }

  return locationCategory ?? DEFAULT_MEASURING_FROM_KIND;
}

export function applyMeasuringFromKind(kind: MeasuringFromKind): {
  subject: MeasuringSubject;
  locationCategory: MeasuringLocationCategory;
} {
  const option = measuringCatalogOption(kind);
  if (!option) {
    return {
      subject: "location",
      locationCategory: DEFAULT_MEASURING_FROM_KIND,
    };
  }

  if (option.subject === "coastline" || option.subject === "sea_level") {
    return {
      subject: option.subject,
      locationCategory: DEFAULT_MEASURING_FROM_KIND,
    };
  }

  return {
    subject: "location",
    locationCategory: kind as MeasuringLocationCategory,
  };
}

export function measuringLocationOverpassSelectors(
  category: MeasuringLocationCategory,
): readonly string[] {
  return measuringCatalogOption(category)?.overpassSelectors ?? [];
}

export function measuringLinearOverpassSelectors(
  kind: MeasuringFromKind,
): readonly string[] {
  return measuringCatalogOption(kind)?.linearSelectors ?? [];
}

export function measuringLocationLabel(kind: MeasuringFromKind): string {
  return measuringCatalogOption(kind)?.label ?? "Place";
}

export function measuringQuestionFor(
  subject: MeasuringSubject,
  locationCategory?: MeasuringLocationCategory,
): MeasuringQuestionDefinition {
  const kind = measuringFromKind(subject, locationCategory);
  const option = measuringCatalogOption(kind);

  if (subject === "sea_level") {
    return SEA_LEVEL_MEASURING_QUESTION;
  }

  if (subject === "coastline") {
    return COASTLINE_MEASURING_QUESTION;
  }

  if (locationCategory === "body_of_water") {
    return BODY_OF_WATER_MEASURING_QUESTION;
  }

  return {
    subject: "location",
    prompt: `Compared to me, are you closer to or further from ${option?.promptNoun ?? "this place"}?`,
    ruleSummary: MEASURE_RULE_SUMMARY,
  };
}

export function measuringQuestionLabel(
  subject: MeasuringSubject,
  locationCategory?: MeasuringLocationCategory,
): string {
  const kind = measuringFromKind(subject, locationCategory);
  const option = measuringCatalogOption(kind);
  return `Measure · ${option?.label.toLowerCase() ?? "place"}`;
}

export function measuringTargetLabel(
  subject: MeasuringSubject,
  locationCategory?: MeasuringLocationCategory,
): string {
  const kind = measuringFromKind(subject, locationCategory);
  return measuringLocationLabel(kind);
}

export function measuringSupportsSearch(kind: MeasuringFromKind): boolean {
  return measuringCatalogOption(kind)?.supportsSearch ?? false;
}

export function measuringSupportsNearest(kind: MeasuringFromKind): boolean {
  return measuringCatalogOption(kind)?.supportsNearest ?? false;
}

export function measuringSupportsMapTarget(kind: MeasuringFromKind): boolean {
  return measuringCatalogOption(kind)?.supportsMapTarget ?? false;
}

export function measuringUsesAllPlacesInArea(kind: MeasuringFromKind): boolean {
  const option = measuringCatalogOption(kind);
  if (!option) {
    return false;
  }

  return (
    option.subject === "location" &&
    option.targetKind === "point" &&
    option.id !== "custom_place" &&
    option.overpassSelectors.length > 0
  );
}

export function measuringMultiPlaceTargetLabel(
  count: number,
  kind: MeasuringFromKind,
): string {
  const label = measuringLocationLabel(kind).toLowerCase();
  if (count === 1) {
    return `1 ${label}`;
  }

  return `${count} ${label}s`;
}

export function measuringTargetKind(
  kind: MeasuringFromKind,
): MeasuringTargetKind {
  return measuringCatalogOption(kind)?.targetKind ?? "point";
}

export function isMeasuringLinearLocation(
  subject: MeasuringSubject,
  locationCategory?: MeasuringLocationCategory | "place",
): boolean {
  if (subject !== "location") {
    return false;
  }

  const targetKind = measuringTargetKind(
    measuringFromKind(subject, locationCategory),
  );
  return targetKind === "linear" || targetKind === "polygon";
}

function readMeasuringFromKindFromAnnotation(
  annotation: AnnotationRecord,
): MeasuringFromKind | null {
  if (annotation.type !== "measuring" || !annotation.metadata.measuringSubject) {
    return null;
  }

  return measuringFromKind(
    annotation.metadata.measuringSubject,
    annotation.metadata.measuringLocationCategory,
  );
}

export function readMeasuringFromKindFromPending(
  question: PendingQuestionRecord,
): MeasuringFromKind | null {
  if (question.toolType !== "measuring") {
    return null;
  }

  const subject = question.placement.metadata.measuringSubject;
  if (subject !== "coastline" && subject !== "location" && subject !== "sea_level") {
    return null;
  }

  const locationCategory = question.placement.metadata.measuringLocationCategory;
  return measuringFromKind(
    subject,
    typeof locationCategory === "string"
      ? (locationCategory as MeasuringLocationCategory | "place")
      : undefined,
  );
}

const measuringCatalogHelpers = buildCatalogHelpers<MeasuringFromKind>({
  toolType: "measuring",
  readOptionFromAnnotation: readMeasuringFromKindFromAnnotation,
  readOptionFromPending: readMeasuringFromKindFromPending,
});

export function usedMeasuringFromKinds(
  annotations: readonly AnnotationRecord[],
  exceptAnnotationId?: string,
): Set<MeasuringFromKind> {
  return measuringCatalogHelpers.usedOptionsFromAnnotations(
    annotations,
    exceptAnnotationId,
  );
}

export function firstAvailableMeasuringFromKind(
  usedKinds: ReadonlySet<MeasuringFromKind>,
): MeasuringFromKind | null {
  return measuringCatalogHelpers.firstAvailableFromCatalog(
    MEASURING_CATALOG,
    usedKinds,
  );
}

export function measuringFromKindUseCount(
  annotations: readonly AnnotationRecord[],
  kind: MeasuringFromKind,
  exceptAnnotationId?: string,
): number {
  return measuringCatalogHelpers.optionUseCountFromAnnotations(
    annotations,
    kind,
    exceptAnnotationId,
  );
}

export function measuringFromKindUseCountFromPending(
  pendingQuestions: readonly PendingQuestionRecord[],
  kind: MeasuringFromKind,
  exceptQuestionId?: string,
): number {
  return measuringCatalogHelpers.optionUseCountFromPending(
    pendingQuestions,
    kind,
    exceptQuestionId,
  );
}
