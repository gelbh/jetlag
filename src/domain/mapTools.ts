import type { AnnotationRecord } from "./annotations";
import type { MapTool } from "./mapToolTypes";
import type { PendingQuestionToolType } from "./sessionChat";

export type QuestionCardCost = "D3P1" | "D2P1" | "D4P2" | "D1P1";

export type DockableMapTool = Exclude<MapTool, "none">;

export interface MapToolDockEntry {
  id: DockableMapTool;
  name: string;
  cost?: QuestionCardCost;
  enabled: boolean;
}

export const MAP_TOOL_DOCK_ENTRIES: readonly MapToolDockEntry[] = [
  { id: "matching", name: "Matching", cost: "D3P1", enabled: true },
  { id: "measuring", name: "Measuring", cost: "D3P1", enabled: true },
  { id: "thermometer", name: "Thermometer", cost: "D2P1", enabled: true },
  { id: "radar", name: "Radar", cost: "D2P1", enabled: true },
  { id: "tentacle", name: "Tentacles", cost: "D4P2", enabled: true },
  { id: "photo", name: "Photo", cost: "D1P1", enabled: true },
  { id: "zone", name: "Zone", enabled: true },
  { id: "pin", name: "Pin", enabled: true },
];

export function mapToolDockLabel(entry: MapToolDockEntry): string {
  return entry.cost ? `${entry.name} (${entry.cost})` : entry.name;
}

export function baseQuestionCostForTool(
  toolType: PendingQuestionToolType,
): QuestionCardCost {
  const entry = MAP_TOOL_DOCK_ENTRIES.find((item) => item.id === toolType);
  if (!entry?.cost) {
    throw new Error(`No question card cost for tool: ${toolType}`);
  }
  return entry.cost;
}

export function mapToolDockMenuLabel(entry: MapToolDockEntry): string {
  return entry.name;
}

const OVERFLOW_TOOL_HINTS: Partial<Record<DockableMapTool, string>> = {
  matching: "Same category on the map?",
  measuring: "Closer or further?",
  thermometer: "Hotter or colder?",
  radar: "Inside or outside a circle?",
  tentacle: "Point-to-point questions",
  photo: "Send me a photo of…",
};

const MARKUP_TOOL_HINTS: Partial<Record<DockableMapTool, string>> = {
  zone: "Draw a play boundary",
  pin: "Mark a point on the map",
};

export function mapToolDockMenuHint(entry: MapToolDockEntry): string | null {
  return (
    OVERFLOW_TOOL_HINTS[entry.id] ?? MARKUP_TOOL_HINTS[entry.id] ?? null
  );
}

export const QUESTION_DOCK_TOOL_IDS = [
  "matching",
  "measuring",
  "thermometer",
  "radar",
  "tentacle",
  "photo",
] as const satisfies readonly DockableMapTool[];

export const MARKUP_DOCK_TOOL_IDS = ["zone", "pin"] as const satisfies readonly DockableMapTool[];

export const WIZARD_DOCK_TOOL_IDS = [
  "matching",
  "measuring",
  "tentacle",
] as const satisfies readonly DockableMapTool[];

export function isWizardDockTool(
  id: MapTool,
): id is (typeof WIZARD_DOCK_TOOL_IDS)[number] {
  return (WIZARD_DOCK_TOOL_IDS as readonly string[]).includes(id);
}

const DOCK_SHORT_LABELS: Record<(typeof QUESTION_DOCK_TOOL_IDS)[number], string> = {
  matching: "Match",
  measuring: "Measure",
  thermometer: "Thermo",
  radar: "Radar",
  tentacle: "Tent",
  photo: "Photo",
};

export function isQuestionDockTool(
  id: DockableMapTool,
): id is (typeof QUESTION_DOCK_TOOL_IDS)[number] {
  return (QUESTION_DOCK_TOOL_IDS as readonly string[]).includes(id);
}

export function isMarkupDockTool(
  id: DockableMapTool,
): id is (typeof MARKUP_DOCK_TOOL_IDS)[number] {
  return (MARKUP_DOCK_TOOL_IDS as readonly string[]).includes(id);
}

export function mapToolDockShortLabel(id: DockableMapTool): string {
  if (isQuestionDockTool(id)) {
    return DOCK_SHORT_LABELS[id];
  }

  const entry = MAP_TOOL_DOCK_ENTRIES.find((item) => item.id === id);
  return entry?.name ?? id;
}

/** @deprecated Use {@link MARKUP_DOCK_TOOL_IDS} — zone and pin moved to Draw menu. */
export const QUICK_DOCK_TOOL_IDS = MARKUP_DOCK_TOOL_IDS;

export function isQuickDockTool(id: DockableMapTool): id is (typeof MARKUP_DOCK_TOOL_IDS)[number] {
  return isMarkupDockTool(id);
}

export function mapToolPlacingLabel(id: DockableMapTool): string {
  const entry = MAP_TOOL_DOCK_ENTRIES.find((item) => item.id === id);
  return entry?.name ?? id;
}

/** Legacy thermometer rows with measuringSubject normalize via migrateAnnotations. */
function isMeasuringAnnotation(annotation: AnnotationRecord): boolean {
  if (annotation.type === "measuring") {
    return true;
  }

  return (
    annotation.type === "thermometer" &&
    annotation.metadata.measuringSubject !== undefined
  );
}

export function annotationMatchesMapTool(
  annotation: AnnotationRecord,
  tool: MapTool,
): boolean {
  if (tool === "none") {
    return false;
  }

  if (tool === "measuring") {
    return isMeasuringAnnotation(annotation);
  }

  if (tool === "thermometer") {
    return (
      annotation.type === "thermometer" && !isMeasuringAnnotation(annotation)
    );
  }

  return annotation.type === tool;
}

export function findAnnotationMapTool(
  annotation: AnnotationRecord,
): DockableMapTool | null {
  if (annotation.type === "thermometer") {
    return isMeasuringAnnotation(annotation) ? "measuring" : "thermometer";
  }

  if (annotation.type === "measuring") {
    return "measuring";
  }

  if (
    annotation.type === "radar" ||
    annotation.type === "matching" ||
    annotation.type === "zone" ||
    annotation.type === "pin" ||
    annotation.type === "tentacle"
  ) {
    return annotation.type;
  }

  return null;
}

export function findLastUndoableAnnotation(
  annotations: AnnotationRecord[],
  sessionId: string,
  tool?: MapTool,
): AnnotationRecord | null {
  const active = annotations.filter(
    (annotation) =>
      annotation.sessionId === sessionId && annotation.status === "active",
  );
  const sorted = [...active].sort((left, right) =>
    left.metadata.createdAt.localeCompare(right.metadata.createdAt),
  );
  const lastPlaced = sorted.at(-1);
  const targetTool =
    tool && tool !== "none"
      ? tool
      : lastPlaced
        ? findAnnotationMapTool(lastPlaced)
        : null;

  if (!targetTool) {
    return null;
  }

  return (
    sorted
      .filter((annotation) => annotationMatchesMapTool(annotation, targetTool))
      .at(-1) ?? null
  );
}

export function findLastRedoableAnnotation(
  annotations: AnnotationRecord[],
  sessionId: string,
  redoIds: readonly string[],
  tool?: MapTool,
): AnnotationRecord | null {
  for (let index = redoIds.length - 1; index >= 0; index -= 1) {
    const annotation = annotations.find((item) => item.id === redoIds[index]);

    if (
      !annotation ||
      annotation.sessionId !== sessionId ||
      annotation.status !== "deleted"
    ) {
      continue;
    }

    if (
      tool &&
      tool !== "none" &&
      !annotationMatchesMapTool(annotation, tool)
    ) {
      continue;
    }

    return annotation;
  }

  return null;
}
