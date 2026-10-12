import { filterConfirmedTentaclePois } from "../../domain/geo/poiCandidateAdapters";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import type { AnnotationRecord, GameArea, TentaclePoi } from "../../domain/map/annotations";
import type { DistanceUnit } from "../../domain/map/distance";
import { poiPinsForCategory } from "../../domain/map/poiPinCategories";
import {
  isTentacleCategoryAvailableInSession,
  type MatchingCategoryId,
  type TentacleExtendedCategoryId,
  tentacleSearchRadiusMetersForSession,
} from "../../domain/questions";
import {
  sessionCustomContentFromRules,
  taggedSetupPinsForCategory,
} from "../../domain/session/catalog/sessionCustomCatalog";
import type { SessionRulesInput } from "../../domain/session/rules";
import {
  buildMatchingPendingInput,
  type ToolPendingInput,
} from "../../hooks/tools/matching/matchingPendingInput";
import { resolveMatchingAnchor } from "../../hooks/tools/matching/resolveMatchingAnchor";
import { buildTentaclePendingInput } from "../../hooks/tools/tentacle/tentaclePendingInput";
import { fetchTentaclePois } from "../geo/overpass/tentacleOverpass";
import { inferTransitMetroId } from "../transit/transitCatalog";

export interface HeavyResolveContext {
  session: SessionRulesInput;
  annotations: readonly AnnotationRecord[];
  gameArea: GameArea;
  distanceUnit: DistanceUnit;
}

type RandomizedCards = { cardDraw?: number; cardKeep?: number };

/** Builds the pending payload for a rolled matching option at `anchor`, or null when it cannot be sent. */
export async function resolveRandomizedMatching(
  anchor: LatLngTuple,
  categoryId: MatchingCategoryId,
  cards: RandomizedCards,
  ctx: HeavyResolveContext,
): Promise<ToolPendingInput | null> {
  const { session, annotations, gameArea } = ctx;
  const { customMatchingAreas, customCategories } = sessionCustomContentFromRules(session);
  const result = await resolveMatchingAnchor({
    seekerPoint: anchor,
    categoryId,
    gameArea,
    matchingFetchOptions: {
      customMatchingAreas,
      customCategories,
      regionPackId: session.regionPackId,
      poiPins: [
        ...taggedSetupPinsForCategory(session.customLocationPins ?? [], categoryId),
        ...poiPinsForCategory(annotations, categoryId),
      ],
    },
  });

  if (result.error) return null;
  if (result.nullAnswer && (result.featureCount === 0 || result.features.length === 0)) {
    return null;
  }
  if (!result.nullAnswer && !result.nearestFeatureId) return null;

  return buildMatchingPendingInput({
    seekerPoint: anchor,
    categoryId,
    customCategories,
    nullAnswer: result.nullAnswer,
    nearestFeatureId: result.nearestFeatureId,
    nearestFeatureName: result.nearestFeatureName,
    nearestFeaturePoint: result.nearestFeaturePoint,
    distanceMeters: result.distanceMeters,
    featureCount: result.featureCount,
    features: result.features,
    transitMetroId: categoryId === "transit_line" ? inferTransitMetroId(gameArea) : null,
    cardDraw: cards.cardDraw,
    cardKeep: cards.cardKeep,
  });
}

/** Builds the pending payload for a rolled tentacle option at `anchor`, or null when it cannot be sent. */
export async function resolveRandomizedTentacle(
  anchor: LatLngTuple,
  categoryId: TentacleExtendedCategoryId,
  cards: RandomizedCards,
  ctx: HeavyResolveContext,
): Promise<ToolPendingInput | null> {
  const { session, annotations } = ctx;
  if (!isTentacleCategoryAvailableInSession(session, categoryId)) return null;

  const searchRadiusMeters = tentacleSearchRadiusMetersForSession(session, categoryId);
  let fetched: TentaclePoi[];
  try {
    fetched = await fetchTentaclePois(anchor, searchRadiusMeters, categoryId, {
      customCategories: session.customCategories,
      customLocationPins: [
        ...(session.customLocationPins ?? []),
        ...poiPinsForCategory(annotations, categoryId),
      ],
      regionPackId: session.regionPackId,
    });
  } catch {
    return null;
  }
  const pois = filterConfirmedTentaclePois(fetched);
  if (pois.length === 0) return null;

  return buildTentaclePendingInput({
    center: anchor,
    categoryId,
    pois,
    searchRadiusMeters,
    distanceUnit: ctx.distanceUnit,
    cardDraw: cards.cardDraw,
    cardKeep: cards.cardKeep,
  });
}
