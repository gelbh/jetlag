import type { MatchingCategoryDefinition } from "../questions/matchingQuestions";
import type { MeasuringCatalogOption } from "../questions/measuringQuestions";
import type { SessionRulesInput } from "../session/sessionRules";
import {
  getRegionPackConfig,
  isKnownRegionPack,
} from "./regionPackRegistry";
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
  if (!isKnownRegionPack(regionPackId)) {
    return category;
  }

  const override =
    getRegionPackConfig(regionPackId)?.matchingLabelOverrides[category.id];
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
  if (!isKnownRegionPack(regionPackId)) {
    return option;
  }

  const override =
    getRegionPackConfig(regionPackId)?.measuringLabelOverrides[option.id];
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
