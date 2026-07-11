import type { AnnotationRecord } from "../map/annotations";
import type { PendingQuestionRecord } from "../session/sessionChat";
import {
  collectUsedAnnotationOptions,
  firstUnusedCatalogOption,
} from "../session/toolSessionOptions";
import { isCountablePendingQuestionStatus } from "./questionRules";

export interface CatalogHelpersConfig<Option> {
  toolType: string;
  readOptionFromAnnotation: (
    annotation: AnnotationRecord,
  ) => Option | null | undefined;
  readOptionFromPending?: (
    question: PendingQuestionRecord,
  ) => Option | null | undefined;
  isPendingQuestionCountable?: (question: PendingQuestionRecord) => boolean;
}

export interface CatalogHelpers<Option> {
  usedOptionsFromAnnotations: (
    annotations: readonly AnnotationRecord[],
    exceptAnnotationId?: string,
  ) => Set<Option>;
  usedOptionsFromPending: (
    pendingQuestions: readonly PendingQuestionRecord[],
    exceptQuestionId?: string,
  ) => Set<Option>;
  firstAvailableFromCatalog: (
    catalog: readonly { id: Option }[],
    usedOptions: ReadonlySet<Option>,
    isEnabled?: (option: Option) => boolean,
  ) => Option | null;
  defaultFromCatalog: (
    catalog: readonly { id: Option }[],
    usedOptions: ReadonlySet<Option>,
    fallback: Option,
    isEnabled?: (option: Option) => boolean,
  ) => Option;
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

export function buildCatalogHelpers<Option>(
  config: CatalogHelpersConfig<Option>,
): CatalogHelpers<Option> {
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

  function usedOptionsFromPending(
    pendingQuestions: readonly PendingQuestionRecord[],
    exceptQuestionId?: string,
  ): Set<Option> {
    if (!readOptionFromPending) {
      return new Set();
    }

    const used = new Set<Option>();
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

      const option = readOptionFromPending(question);
      if (option !== null && option !== undefined) {
        used.add(option);
      }
    }

    return used;
  }

  function firstAvailableFromCatalog(
    catalog: readonly { id: Option }[],
    usedOptions: ReadonlySet<Option>,
    isEnabled: (option: Option) => boolean = () => true,
  ): Option | null {
    return firstUnusedCatalogOption(catalog, usedOptions, isEnabled);
  }

  function defaultFromCatalog(
    catalog: readonly { id: Option }[],
    usedOptions: ReadonlySet<Option>,
    fallback: Option,
    isEnabled: (option: Option) => boolean = () => true,
  ): Option {
    return firstAvailableFromCatalog(catalog, usedOptions, isEnabled) ?? fallback;
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
    usedOptionsFromPending,
    firstAvailableFromCatalog,
    defaultFromCatalog,
    optionUseCountFromAnnotations,
    optionUseCountFromPending,
  };
}
