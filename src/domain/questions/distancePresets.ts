import type { AnnotationRecord } from "../map/annotations";
import type { PendingQuestionRecord } from "../session/sessionChat";
import {
  collectUsedAnnotationOptions,
  firstUnusedPreset,
  isPresetOptionAvailable,
  presetMetersForMiles,
} from "../session/toolSessionOptions";
import { isCountablePendingQuestionStatus } from "./questionRules";

export {
  matchPresetMeters,
  PRESET_MATCH_TOLERANCE_METERS,
  UI_PRESET_MATCH_TOLERANCE_METERS,
} from "../map/distancePresets";

export interface PresetCatalogHelpersConfig<Option extends string | number> {
  toolType: string;
  readOptionFromAnnotation: (
    annotation: AnnotationRecord,
  ) => Option | null | undefined;
  readOptionFromPending?: (
    question: PendingQuestionRecord,
  ) => Option | null | undefined;
  isPendingQuestionCountable?: (question: PendingQuestionRecord) => boolean;
}

export interface PresetCatalogHelpers<Option extends string | number> {
  usedOptionsFromAnnotations: (
    annotations: readonly AnnotationRecord[],
    exceptAnnotationId?: string,
  ) => Set<Option>;
  firstUnusedFromPresets: (
    presets: readonly Option[],
    usedOptions: ReadonlySet<Option>,
  ) => Option | null;
  isOptionAvailable: (
    option: Option | null,
    usedOptions: ReadonlySet<Option>,
  ) => boolean;
  optionUseCountFromAnnotations: (
    annotations: readonly AnnotationRecord[],
    option: Option,
    exceptAnnotationId?: string,
  ) => number;
  optionUseCountFromPending: (
    pendingQuestions: readonly PendingQuestionRecord[],
    option: Option,
    exceptQuestionId?: string,
  ) => number;
}

export function buildPresetCatalogHelpers<Option extends string | number>(
  config: PresetCatalogHelpersConfig<Option>,
): PresetCatalogHelpers<Option> {
  const {
    toolType,
    readOptionFromAnnotation,
    readOptionFromPending,
    isPendingQuestionCountable = (question) =>
      isCountablePendingQuestionStatus(question.status),
  } = config;

  function usedOptionsFromAnnotations(
    annotations: readonly AnnotationRecord[],
    exceptAnnotationId?: string,
  ): Set<Option> {
    return collectUsedAnnotationOptions(
      annotations,
      readOptionFromAnnotation,
      exceptAnnotationId,
    );
  }

  function firstUnusedFromPresets(
    presets: readonly Option[],
    usedOptions: ReadonlySet<Option>,
  ): Option | null {
    return firstUnusedPreset(presets, usedOptions);
  }

  function isOptionAvailable(
    option: Option | null,
    usedOptions: ReadonlySet<Option>,
  ): boolean {
    return isPresetOptionAvailable(option, usedOptions);
  }

  function optionUseCountFromAnnotations(
    annotations: readonly AnnotationRecord[],
    option: Option,
    exceptAnnotationId?: string,
  ): number {
    let count = 0;
    for (const annotation of annotations) {
      if (annotation.status !== "active" || annotation.type !== toolType) {
        continue;
      }
      if (exceptAnnotationId && annotation.id === exceptAnnotationId) {
        continue;
      }
      if (readOptionFromAnnotation(annotation) === option) {
        count += 1;
      }
    }
    return count;
  }

  function optionUseCountFromPending(
    pendingQuestions: readonly PendingQuestionRecord[],
    option: Option,
    exceptQuestionId?: string,
  ): number {
    if (!readOptionFromPending) {
      return 0;
    }

    let count = 0;
    for (const question of pendingQuestions) {
      if (question.toolType !== toolType) {
        continue;
      }
      if (exceptQuestionId && question.id === exceptQuestionId) {
        continue;
      }
      if (!isPendingQuestionCountable(question)) {
        continue;
      }
      if (readOptionFromPending(question) === option) {
        count += 1;
      }
    }
    return count;
  }

  return {
    usedOptionsFromAnnotations,
    firstUnusedFromPresets,
    isOptionAvailable,
    optionUseCountFromAnnotations,
    optionUseCountFromPending,
  };
}

export function presetMilesForDistanceMeters<Miles extends number>(
  distanceMeters: number,
  presetsMiles: readonly Miles[],
  milesToMeters: (miles: number) => number,
  toleranceMeters = 1,
): Miles | null {
  return presetMetersForMiles(
    distanceMeters,
    presetsMiles,
    milesToMeters,
    toleranceMeters,
  );
}
