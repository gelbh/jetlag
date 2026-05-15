import type { AnnotationRecord } from "./annotations";

export function collectUsedAnnotationOptions<Option>(
  annotations: readonly AnnotationRecord[],
  readOption: (annotation: AnnotationRecord) => Option | null | undefined,
  exceptAnnotationId?: string,
): Set<Option> {
  const used = new Set<Option>();

  for (const annotation of annotations) {
    if (annotation.status !== "active") {
      continue;
    }

    if (exceptAnnotationId && annotation.id === exceptAnnotationId) {
      continue;
    }

    const option = readOption(annotation);
    if (option !== null && option !== undefined) {
      used.add(option);
    }
  }

  return used;
}

export function firstUnusedCatalogOption<Option>(
  catalog: readonly { id: Option }[],
  usedOptions: ReadonlySet<Option>,
  isEnabled: (option: Option) => boolean = () => true,
): Option | null {
  for (const entry of catalog) {
    if (isEnabled(entry.id) && !usedOptions.has(entry.id)) {
      return entry.id;
    }
  }

  return null;
}

export function firstUnusedPreset<Option>(
  presets: readonly Option[],
  usedOptions: ReadonlySet<Option>,
): Option | null {
  for (const preset of presets) {
    if (!usedOptions.has(preset)) {
      return preset;
    }
  }

  return null;
}

export function isCatalogOptionAvailable<Option>(
  option: Option,
  usedOptions: ReadonlySet<Option>,
  isEnabled: (value: Option) => boolean = () => true,
): boolean {
  return isEnabled(option) && !usedOptions.has(option);
}

export function isPresetOptionAvailable<Option>(
  option: Option | null,
  usedOptions: ReadonlySet<Option>,
): boolean {
  return option !== null && !usedOptions.has(option);
}

export function presetMetersForMiles<Option extends number>(
  distanceMeters: number,
  presetsMiles: readonly Option[],
  milesToMeters: (miles: number) => number,
  toleranceMeters = 1,
): Option | null {
  for (const miles of presetsMiles) {
    if (Math.abs(milesToMeters(miles) - distanceMeters) < toleranceMeters) {
      return miles;
    }
  }

  return null;
}
