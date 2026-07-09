import { MATCHING_CATEGORIES } from "../questions/matchingQuestions";
import { MEASURING_CATALOG } from "../questions/measuringQuestions";
import {
  CUSTOM_QUESTION_PACK_MATCHING,
  CUSTOM_QUESTION_PACK_MEASURING,
  isCustomQuestionPackCategoryId,
} from "../questions/customQuestionPack";
import type { MatchingCategoryDefinition } from "../questions/matchingQuestions";
import type { MeasuringCatalogOption } from "../questions/measuringQuestions";
import { customCategoryToMatchingDefinition } from "../questions/matchingQuestions";
import {
  customCategoryToMeasuringOption,
  resolveMeasuringCatalogOption,
} from "./sessionCustomCatalog";
import type { SessionCustomMeasureGeometry } from "./customMeasureGeometry";
import { customMeasureGeometryToMeasuringOption } from "./customMeasureGeometryCatalog";
import type { SessionRulesInput } from "./sessionRules";

export const BASE_MATCHING_CATEGORY_COUNT = 20;
export const BASE_MEASURING_CATALOG_COUNT = 21;

export function isExpansionPackEnabled(
  session: SessionRulesInput,
): boolean {
  return session.expansionPackEnabled === true;
}

export function isCustomQuestionPackEnabled(
  session: SessionRulesInput,
): boolean {
  return session.customQuestionPackEnabled === true;
}

export function isPreviewQuestionBeforeSendEnabled(
  session: SessionRulesInput,
): boolean {
  return session.previewQuestionBeforeSend === true;
}

export function baseMatchingCategories(): readonly MatchingCategoryDefinition[] {
  return MATCHING_CATEGORIES.filter((category) => category.phase === 1);
}

export function baseMeasuringCatalog(): readonly MeasuringCatalogOption[] {
  return MEASURING_CATALOG;
}

export function availableMatchingCategories(
  session: SessionRulesInput,
): MatchingCategoryDefinition[] {
  const base = [...baseMatchingCategories()];
  const pack = isCustomQuestionPackEnabled(session)
    ? [...CUSTOM_QUESTION_PACK_MATCHING]
    : [];
  const hostCustom = (session.customCategories ?? []).map(
    customCategoryToMatchingDefinition,
  );

  return [...base, ...pack, ...hostCustom];
}

export function availableMeasuringCatalog(
  session: SessionRulesInput,
): MeasuringCatalogOption[] {
  const base = [...baseMeasuringCatalog()];
  const pack = isCustomQuestionPackEnabled(session)
    ? [...CUSTOM_QUESTION_PACK_MEASURING]
    : [];
  const hostCustom = (session.customCategories ?? []).map(
    customCategoryToMeasuringOption,
  );
  const customGeo = (session.customMeasureGeometries ?? []).map(
    customMeasureGeometryToMeasuringOption,
  );

  return [...base, ...pack, ...hostCustom, ...customGeo];
}

export function resolveAvailableMatchingCategory(
  categoryId: string,
  session: SessionRulesInput,
): MatchingCategoryDefinition | null {
  return (
    availableMatchingCategories(session).find(
      (category) => category.id === categoryId,
    ) ?? null
  );
}

export function resolveAvailableMeasuringOption(
  kind: string,
  session: SessionRulesInput,
): MeasuringCatalogOption | null {
  return (
    resolveMeasuringCatalogOption(
      kind as Parameters<typeof resolveMeasuringCatalogOption>[0],
      session.customCategories ?? [],
    ) ??
    availableMeasuringCatalog(session).find((option) => option.id === kind) ??
    null
  );
}

export function isCategoryInDefaultPicker(
  categoryId: string,
  session: SessionRulesInput,
): boolean {
  if (isCustomQuestionPackCategoryId(categoryId)) {
    return isCustomQuestionPackEnabled(session);
  }

  if (categoryId.startsWith("custom:")) {
    return (session.customCategories ?? []).some(
      (category) => category.id === categoryId,
    );
  }

  if (categoryId.startsWith("custom_geo:")) {
    return (session.customMeasureGeometries ?? []).some(
      (geometry) => geometry.id === categoryId,
    );
  }

  return baseMatchingCategories().some(
    (category) => category.id === categoryId,
  );
}

export function assertBaseCatalogIntegrity(): {
  matchingCount: number;
  measuringCount: number;
} {
  return {
    matchingCount: baseMatchingCategories().length,
    measuringCount: baseMeasuringCatalog().length,
  };
}

export function customMeasureGeometriesForSession(
  session: SessionRulesInput,
): readonly SessionCustomMeasureGeometry[] {
  return session.customMeasureGeometries ?? [];
}
