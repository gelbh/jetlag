import type { Feature, LineString } from "geojson";
import { filterConfirmedTentaclePois } from "../../domain/geo/poiCandidateAdapters";
import type { MeasuringPlace } from "../../domain/geo/types";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import type { AnnotationRecord, GameArea, TentaclePoi } from "../../domain/map/annotations";
import type { DistanceUnit } from "../../domain/map/distance";
import { poiPinsForCategory } from "../../domain/map/poiPinCategories";
import {
  applyMeasuringFromKind,
  isMeasuringLinearLocation,
  isTentacleCategoryAvailableInSession,
  type MatchingCategoryId,
  type MeasuringFromKind,
  measuringUsesAllPlacesInArea,
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
import { resolveAllPlacesTarget } from "../../hooks/tools/measuring/allPlacesTarget";
import { buildMeasuringPendingInput } from "../../hooks/tools/measuring/measuringPendingInput";
import {
  fetchMeasuringCoastlineContext,
  fetchMeasuringLinearContext,
} from "../../hooks/tools/measuringToolResolvers";
import { buildTentaclePendingInput } from "../../hooks/tools/tentacle/tentaclePendingInput";
import { usePreloadStore } from "../../state/preloadStore";
import type { LoadTask } from "../core/progress/loadTask";
import { adminBorderKindAvailability } from "../geo/overpass/adminDivisionAvailability";
import { fetchMeasuringPlacesInArea } from "../geo/overpass/measuringPlaces";
import { fetchTentaclePois } from "../geo/overpass/tentacleOverpass";
import { inferTransitMetroId } from "../transit/transitCatalog";

export interface HeavyResolveContext {
  session: SessionRulesInput;
  annotations: readonly AnnotationRecord[];
  gameArea: GameArea;
  distanceUnit: DistanceUnit;
  task?: LoadTask;
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
      subregionId: session.regionPackSubregionId,
      poiPins: [
        ...taggedSetupPinsForCategory(session.customLocationPins ?? [], categoryId),
        ...poiPinsForCategory(annotations, categoryId),
      ],
      task: ctx.task,
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
      subregionId: session.regionPackSubregionId,
      task: ctx.task,
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

interface MeasuringTarget {
  distanceMeters: number;
  targetPoint: LatLngTuple;
  targetName: string | null;
  places: MeasuringPlace[];
  coastSegments: Feature<LineString>[];
}

async function resolveMeasuringTarget(
  anchor: LatLngTuple,
  kind: MeasuringFromKind,
  ctx: HeavyResolveContext,
): Promise<MeasuringTarget | null> {
  const { session, annotations, gameArea } = ctx;
  const { subject, locationCategory } = applyMeasuringFromKind(kind);

  if (subject === "coastline") {
    const result = await fetchMeasuringCoastlineContext(anchor, gameArea, {
      regionPackId: session.regionPackId,
      task: ctx.task,
    });
    if (!result.ok || result.segments.length === 0) return null;
    return {
      distanceMeters: result.distanceMeters,
      targetPoint: result.coastPoint,
      targetName: null,
      places: [],
      coastSegments: result.segments,
    };
  }

  if (isMeasuringLinearLocation(subject, locationCategory)) {
    const result = await fetchMeasuringLinearContext(
      anchor,
      gameArea,
      subject,
      locationCategory,
      session.customMeasureGeometries ?? [],
      session.customMatchingAreas,
      session.regionPackId,
      ctx.task,
    );
    if (!result.ok) return null;
    return {
      distanceMeters: result.distanceMeters,
      targetPoint: result.point,
      targetName: null,
      places: [],
      coastSegments: result.segments,
    };
  }

  if (measuringUsesAllPlacesInArea(kind)) {
    const fetched = await fetchMeasuringPlacesInArea(
      gameArea,
      locationCategory,
      session.customCategories ?? [],
      session.regionPackId,
      { subregionId: session.regionPackSubregionId, ...(ctx.task ? { task: ctx.task } : {}) },
    );
    const target = resolveAllPlacesTarget({
      seekerPoint: anchor,
      fetched,
      customLocationPins: session.customLocationPins ?? [],
      annotations,
      category: locationCategory,
      kind,
    });
    if (!target) return null;
    return { ...target, coastSegments: [] };
  }

  return null;
}

/** Builds the pending payload for a rolled measuring option at `anchor`, or null when it cannot be sent. */
export async function resolveRandomizedMeasuring(
  anchor: LatLngTuple,
  kind: MeasuringFromKind,
  cards: RandomizedCards,
  ctx: HeavyResolveContext,
): Promise<ToolPendingInput | null> {
  if (
    kind === "sea_level" ||
    kind === "custom_place" ||
    kind.startsWith("custom:") ||
    kind.startsWith("custom_geo:") ||
    !adminBorderKindAvailability(
      kind,
      usePreloadStore.getState().adminDivisionCounts,
      ctx.session.regionPackId,
    )
  ) {
    return null;
  }

  let target: MeasuringTarget | null;
  try {
    target = await resolveMeasuringTarget(anchor, kind, ctx);
  } catch {
    return null;
  }
  if (!target) return null;

  const { subject, locationCategory } = applyMeasuringFromKind(kind);
  return buildMeasuringPendingInput({
    seekerPoint: anchor,
    subject,
    locationCategory,
    distanceMeters: target.distanceMeters,
    targetPoint: target.targetPoint,
    targetName: target.targetName,
    places: target.places,
    coastSegments: target.coastSegments,
    seaLevelNearRegion: null,
    anchorElevationMeters: null,
    usesAllPlacesInArea: measuringUsesAllPlacesInArea(kind),
    cardDraw: cards.cardDraw,
    cardKeep: cards.cardKeep,
  });
}
