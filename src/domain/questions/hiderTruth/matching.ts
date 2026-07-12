import type { GameArea } from "../../map/annotations";
import type { LatLngTuple } from "../../geometry/geometry";
import { classifyAdminDivisionAtPoint } from "../../../services/geo/adminDivisionBoundaries";
import { classifyLandmassAtPoint } from "../../../services/geo/landmassFeatures";
import {
  gtfsStopsShareStationOrRoute,
  loadGtfsBundle,
  nearestGtfsStopInGameArea,
} from "../../../services/transit/gtfsRouteGraph";
import type { PendingQuestionRecord } from "../../session/sessionChat";
import {
  deserializeMatchingFeatures,
  matchingFeaturesToAdminDivisions,
  matchingFeaturesToBoundedRegions,
  nearestMatchingFeatureIdForPoint,
} from "../../geo/matchingAdapters";
import type { MatchingCategoryId } from "../matchingQuestions";
import { getMatchingCategory } from "../matchingQuestions";
import {
  parseMatchingAnchor,
  resultFromReplyId,
  truthUnavailable,
  type HiderTruthResult,
} from "./shared";

function matchingFeatureIdAtStation(
  stationCenter: LatLngTuple,
  categoryId: MatchingCategoryId,
  featuresJson: string,
): string | null {
  const features = deserializeMatchingFeatures(featuresJson);
  const category = getMatchingCategory(categoryId);

  if (category.resolver === "reverseGeocodeAdmin") {
    const divisions = matchingFeaturesToAdminDivisions(features);
    if (!divisions) {
      return null;
    }

    return classifyAdminDivisionAtPoint(stationCenter, divisions)?.id ?? null;
  }

  if (category.resolver === "landmass") {
    const landmasses = matchingFeaturesToBoundedRegions(features);
    if (!landmasses) {
      return null;
    }

    return classifyLandmassAtPoint(stationCenter, landmasses)?.id ?? null;
  }

  return nearestMatchingFeatureIdForPoint(stationCenter, features);
}

export function truthMatching(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
): HiderTruthResult | null {
  const metadata = pending.placement.metadata;
  const featuresJson = metadata.matchingFeaturesJson;
  const seekerFeatureId = metadata.matchingNearestFeatureId;
  const categoryId = metadata.matchingCategory;

  if (typeof featuresJson !== "string" || typeof categoryId !== "string") {
    return truthUnavailable();
  }

  const stationFeatureId = matchingFeatureIdAtStation(
    stationCenter,
    categoryId as MatchingCategoryId,
    featuresJson,
  );

  const allowsNull = pending.replyOptions.some((option) => option.id === "null");

  if (!stationFeatureId) {
    if (allowsNull) {
      return resultFromReplyId(pending, "null");
    }

    return resultFromReplyId(pending, "no");
  }

  if (typeof seekerFeatureId !== "string") {
    return allowsNull
      ? resultFromReplyId(pending, "null")
      : resultFromReplyId(pending, "no");
  }

  const replyId = stationFeatureId === seekerFeatureId ? "yes" : "no";
  return resultFromReplyId(pending, replyId);
}

async function truthMatchingTransitLineWithGtfs(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
  metroId: string,
  gameArea: GameArea,
): Promise<HiderTruthResult | null> {
  const metadata = pending.placement.metadata;
  const seekerFeatureId = metadata.matchingNearestFeatureId;
  const allowsNull = pending.replyOptions.some((option) => option.id === "null");
  const seekerPoint = parseMatchingAnchor(metadata);

  if (!seekerPoint) {
    return null;
  }

  const bundle = await loadGtfsBundle(metroId);
  if (!bundle || bundle.stops.length === 0) {
    return null;
  }

  const seekerStop = nearestGtfsStopInGameArea(
    seekerPoint,
    bundle,
    gameArea,
    metroId,
  );
  const hiderStop = nearestGtfsStopInGameArea(
    stationCenter,
    bundle,
    gameArea,
    metroId,
  );

  if (!seekerStop || !hiderStop) {
    if (allowsNull) {
      return resultFromReplyId(pending, "null");
    }
    return resultFromReplyId(pending, "no");
  }

  if (typeof seekerFeatureId === "string") {
    const legacyMatch = seekerFeatureId === hiderStop.id;
    const graphMatch = gtfsStopsShareStationOrRoute(
      seekerStop.id,
      hiderStop.id,
      bundle,
    );
    return resultFromReplyId(pending, legacyMatch || graphMatch ? "yes" : "no");
  }

  const graphMatch = gtfsStopsShareStationOrRoute(
    seekerStop.id,
    hiderStop.id,
    bundle,
  );
  return resultFromReplyId(pending, graphMatch ? "yes" : "no");
}

export async function truthMatchingAsync(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
  gameArea?: GameArea,
): Promise<HiderTruthResult | null> {
  const metadata = pending.placement.metadata;
  const categoryId = metadata.matchingCategory;
  const metroId = metadata.transitMetroId;

  if (
    categoryId === "transit_line" &&
    typeof metroId === "string" &&
    metroId.length > 0 &&
    gameArea
  ) {
    const gtfsTruth = await truthMatchingTransitLineWithGtfs(
      pending,
      stationCenter,
      metroId,
      gameArea,
    );
    if (gtfsTruth) {
      return gtfsTruth;
    }
  }

  return truthMatching(pending, stationCenter);
}
