import type { MatchingCategoryId, MeasuringFromKind } from "../../domain/questions";
import type { RandomizePresenceSource } from "../../domain/questions/randomizeQuestion";
import type { PendingQuestionToolType } from "../../domain/session/activity/sessionChat";
import type { SessionRulesInput } from "../../domain/session/rules";
import { usePreloadStore } from "../../state/preloadStore";
import {
  adminBorderKindAvailability,
  isAdminDivisionCategoryAvailable,
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
      if (!regionPackId) {
        return false;
      }
      if (toolType === "measuring") {
        return !adminBorderKindAvailability(
          categoryId as MeasuringFromKind,
          adminDivisionCounts,
          regionPackId,
        );
      }
      return !isAdminDivisionCategoryAvailable(
        categoryId as MatchingCategoryId,
        adminDivisionCounts,
        regionPackId,
      );
    },
  };
}
