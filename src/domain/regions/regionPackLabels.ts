import type { MatchingCategoryDefinition } from "../questions/matchingQuestions";
import type { MeasuringCatalogOption } from "../questions/measuringQuestions";
import type { SessionRulesInput } from "../session/sessionRules";
import {
  DUBLIN_MATCHING_LABEL_OVERRIDES,
  DUBLIN_MEASURING_LABEL_OVERRIDES,
  isDublinRegionPack,
} from "./dublinRegionPack";
import type { RegionPackId } from "./regionPack";

export function sessionRegionPackId(
  session: Pick<SessionRulesInput, "regionPackId">,
): RegionPackId | undefined {
  return session.regionPackId;
}

export function applyRegionPackMatchingLabels(
  category: MatchingCategoryDefinition,
  regionPackId: RegionPackId | undefined,
): MatchingCategoryDefinition {
  if (!isDublinRegionPack(regionPackId)) {
    return category;
  }

  const override = DUBLIN_MATCHING_LABEL_OVERRIDES[category.id];
  if (!override) {
    return category;
  }

  return {
    ...category,
    label: override.label,
    promptNoun: override.promptNoun,
    ruleSummary: override.ruleSummary ?? category.ruleSummary,
  };
}

export function resolveMatchingCategoryLabelForSession(
  category: MatchingCategoryDefinition,
  session: Pick<SessionRulesInput, "regionPackId">,
): string {
  return applyRegionPackMatchingLabels(
    category,
    sessionRegionPackId(session),
  ).label;
}

export function applyRegionPackMeasuringLabels(
  option: MeasuringCatalogOption,
  regionPackId: RegionPackId | undefined,
): MeasuringCatalogOption {
  if (!isDublinRegionPack(regionPackId)) {
    return option;
  }

  const override = DUBLIN_MEASURING_LABEL_OVERRIDES[option.id];
  if (!override) {
    return option;
  }

  return {
    ...option,
    label: override.label,
    promptNoun: override.promptNoun,
  };
}

export function resolveMeasuringOptionLabelForSession(
  option: MeasuringCatalogOption,
  session: Pick<SessionRulesInput, "regionPackId">,
): string {
  return applyRegionPackMeasuringLabels(option, sessionRegionPackId(session))
    .label;
}
