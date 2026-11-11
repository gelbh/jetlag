import type { MatchingCategoryId, MeasuringFromKind } from "../../domain/questions";
import type { RandomizePresenceSource } from "../../domain/questions/randomizeQuestion";
import type { PendingQuestionToolType } from "../../domain/session/activity/sessionChat";
import type { SessionRulesInput } from "../../domain/session/rules";
import { usePreloadStore } from "../../state/preloadStore";
import {
  adminBorderKindAvailability,
  isAdminDivisionCategoryAvailable,
  isAdminDivisionCategoryProbeFailed,
  isMeasuringAdminBorderProbeFailed,
} from "../geo/overpass/adminDivisionAvailability";

type PresenceToolType = Extract<PendingQuestionToolType, "matching" | "measuring" | "tentacle">;

/** Preload-backed presence source for Randomize roll sets (denylist + admin + probe counts). */
export function randomizePresenceFromPreload(
  session: SessionRulesInput,
  toolType: PresenceToolType,
): RandomizePresenceSource {
  const regionPackId = session.regionPackId;
  const { adminDivisionCounts, categoryPresenceCounts } = usePreloadStore.getState();
  return {
    categoryPresenceCounts,
    isAdminUnavailable: (categoryId) => {
      if (toolType === "measuring") {
        if (
          isMeasuringAdminBorderProbeFailed(
            categoryId as MeasuringFromKind,
            adminDivisionCounts,
            regionPackId,
          )
        ) {
          return true;
        }
        if (!regionPackId) {
          return false;
        }
        return !adminBorderKindAvailability(
          categoryId as MeasuringFromKind,
          adminDivisionCounts,
          regionPackId,
        );
      }
      if (
        isAdminDivisionCategoryProbeFailed(
          categoryId as MatchingCategoryId,
          adminDivisionCounts,
          regionPackId,
        )
      ) {
        return true;
      }
      if (!regionPackId) {
        return false;
      }
      return !isAdminDivisionCategoryAvailable(
        categoryId as MatchingCategoryId,
        adminDivisionCounts,
        regionPackId,
      );
    },
  };
}
