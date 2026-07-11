import type { Feature, LineString, Point } from "geojson";
import type { TentaclePoi } from "../map/annotations";
import {
  distanceBetweenPoints,
  nearestPointToCoastlines,
  type LatLngTuple,
} from "../geometry/geometry";
import type { MeasuringRegionInput } from "../geometry/measuringRegions";
import { isMeasuringLinearLocation } from "./measuringQuestions";
import type { MatchingCategoryId } from "./matchingQuestions";
import { getMatchingCategory } from "./matchingQuestions";
import type { PendingQuestionRecord } from "../session/sessionChat";
import {
  deserializeMatchingFeatures,
  matchingFeaturesToAdminDivisions,
  matchingFeaturesToBoundedRegions,
  nearestMatchingFeatureIdForPoint,
} from "../../services/geo/matchingFeatures";
import {
  gtfsStopsShareStationOrRoute,
  loadGtfsBundle,
  nearestGtfsStop,
} from "../../services/transit/gtfsRouteGraph";
import {
  classifyAdminDivisionAtPoint,
} from "../../services/geo/adminDivisionBoundaries";
import { classifyLandmassAtPoint } from "../../services/geo/landmassFeatures";
import { DEFAULT_RADIUS_METERS } from "../map/distance";
import { tentacleRadiusFromMetadata } from "./tentacleQuestions";
import { fetchElevations } from "../../services/geo/elevation";

export interface HiderTruthResult {
  replyId: string;
  label: string;
  unavailable?: boolean;
  unavailableReason?: string;
}

const UNAVAILABLE_NO_ZONE =
  "Truth unavailable. Set your hiding zone first.";
const UNAVAILABLE_GENERIC = "Truth unavailable. Cannot compute.";

function truthUnavailable(reason = UNAVAILABLE_GENERIC): HiderTruthResult {
  return {
    replyId: "",
    label: reason,
    unavailable: true,
    unavailableReason: reason,
  };
}

function resultFromReplyId(
  pending: PendingQuestionRecord,
  replyId: string,
): HiderTruthResult {
  const option = pending.replyOptions.find((item) => item.id === replyId);
  return {
    replyId,
    label: option?.label ?? replyId,
  };
}

function parseMatchingAnchor(
  metadata: Record<string, unknown>,
): LatLngTuple | null {
  const anchor = metadata.matchingAnchor;
  if (
    typeof anchor !== "object" ||
    anchor === null ||
    !("lat" in anchor) ||
    !("lng" in anchor)
  ) {
    return null;
  }

  const { lat, lng } = anchor as { lat: unknown; lng: unknown };
  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }

  return [lat, lng];
}

function parsePointGeometry(geometryJson: string): LatLngTuple | null {
  try {
    const geometry = JSON.parse(geometryJson) as Feature<Point>;
    if (geometry.geometry.type !== "Point") {
      return null;
    }

    const [lng, lat] = geometry.geometry.coordinates;
    return [lat, lng];
  } catch {
    return null;
  }
}

function parseLineEndpoints(geometryJson: string): {
  start: LatLngTuple;
  end: LatLngTuple;
} | null {
  try {
    const geometry = JSON.parse(geometryJson) as Feature<LineString>;
    if (
      geometry.geometry.type !== "LineString" ||
      geometry.geometry.coordinates.length < 2
    ) {
      return null;
    }

    const first = geometry.geometry.coordinates[0];
    const last =
      geometry.geometry.coordinates[geometry.geometry.coordinates.length - 1];
    return {
      start: [first[1], first[0]],
      end: [last[1], last[0]],
    };
  } catch {
    return null;
  }
}

function truthRadar(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
): HiderTruthResult | null {
  const seekerPoint = parsePointGeometry(pending.placement.geometryJson);
  const radiusMeters = pending.placement.metadata.radiusMeters;
  if (!seekerPoint || typeof radiusMeters !== "number") {
    return truthUnavailable();
  }

  const distanceMeters = distanceBetweenPoints(stationCenter, seekerPoint);
  const replyId = distanceMeters <= radiusMeters ? "yes" : "no";
  return resultFromReplyId(pending, replyId);
}

function truthThermometer(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
): HiderTruthResult | null {
  const line = parseLineEndpoints(pending.placement.geometryJson);
  if (!line) {
    return truthUnavailable();
  }

  const distanceToStart = distanceBetweenPoints(stationCenter, line.start);
  const distanceToEnd = distanceBetweenPoints(stationCenter, line.end);
  const replyId =
    distanceToEnd + 1e-6 < distanceToStart
      ? "hotter"
      : "colder";
  return resultFromReplyId(pending, replyId);
}

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

function truthMatching(
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
    return allowsNull ? resultFromReplyId(pending, "null") : resultFromReplyId(pending, "no");
  }

  const replyId = stationFeatureId === seekerFeatureId ? "yes" : "no";
  return resultFromReplyId(pending, replyId);
}

async function truthMatchingTransitLineWithGtfs(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
  metroId: string,
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

  const seekerStop = nearestGtfsStop(seekerPoint, bundle.stops);
  const hiderStop = nearestGtfsStop(stationCenter, bundle.stops);

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

async function truthMatchingAsync(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
): Promise<HiderTruthResult | null> {
  const metadata = pending.placement.metadata;
  const categoryId = metadata.matchingCategory;
  const metroId = metadata.transitMetroId;

  if (
    categoryId === "transit_line" &&
    typeof metroId === "string" &&
    metroId.length > 0
  ) {
    const gtfsTruth = await truthMatchingTransitLineWithGtfs(
      pending,
      stationCenter,
      metroId,
    );
    if (gtfsTruth) {
      return gtfsTruth;
    }
  }

  return truthMatching(pending, stationCenter);
}

function seekerAnchorFromMetadata(
  metadata: Record<string, unknown>,
): LatLngTuple | null {
  const anchor = metadata.measuringAnchor;
  if (
    anchor &&
    typeof anchor === "object" &&
    "lat" in anchor &&
    "lng" in anchor &&
    typeof anchor.lat === "number" &&
    typeof anchor.lng === "number"
  ) {
    return [anchor.lat, anchor.lng];
  }

  return null;
}

function minDistanceToPlaces(
  point: LatLngTuple,
  places: Array<{ point: LatLngTuple }>,
): number | null {
  if (places.length === 0) {
    return null;
  }

  return Math.min(
    ...places.map((place) => distanceBetweenPoints(point, place.point)),
  );
}

function truthMeasuringSync(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
): HiderTruthResult | null {
  const metadata = pending.placement.metadata;
  const regionInputJson = metadata.measuringRegionInputJson;
  if (typeof regionInputJson !== "string") {
    return truthUnavailable();
  }

  let regionInput: Omit<MeasuringRegionInput, "measuringAnswer">;
  try {
    regionInput = JSON.parse(regionInputJson) as Omit<
      MeasuringRegionInput,
      "measuringAnswer"
    >;
  } catch {
    return truthUnavailable();
  }

  const seekerAnchor = seekerAnchorFromMetadata(metadata);
  if (!seekerAnchor) {
    return truthUnavailable();
  }

  const { measuringSubject, measuringLocationCategory } = regionInput;

  if (measuringSubject === "sea_level") {
    return null;
  }

  if (
    measuringSubject === "coastline" ||
    isMeasuringLinearLocation(
      measuringSubject,
      measuringLocationCategory ?? undefined,
    )
  ) {
    const coastNearestStation = nearestPointToCoastlines(
      stationCenter,
      regionInput.measuringCoastSegments,
    );
    const coastNearestSeeker = nearestPointToCoastlines(
      seekerAnchor,
      regionInput.measuringCoastSegments,
    );

    if (!coastNearestStation || !coastNearestSeeker) {
      return truthUnavailable();
    }

    const replyId =
      coastNearestStation.distanceMeters < coastNearestSeeker.distanceMeters
        ? "closer"
        : "further";
    return resultFromReplyId(pending, replyId);
  }

  if (regionInput.usesAllPlacesInArea) {
    const stationDistance = minDistanceToPlaces(
      stationCenter,
      regionInput.measuringPlaces,
    );
    const seekerDistance = minDistanceToPlaces(
      seekerAnchor,
      regionInput.measuringPlaces,
    );

    if (stationDistance === null || seekerDistance === null) {
      return truthUnavailable();
    }

    const replyId = stationDistance < seekerDistance ? "closer" : "further";
    return resultFromReplyId(pending, replyId);
  }

  const targetPoint = regionInput.measuringTargetPoint;
  if (!targetPoint) {
    return truthUnavailable();
  }

  const stationDistance = distanceBetweenPoints(stationCenter, targetPoint);
  const seekerDistance = distanceBetweenPoints(seekerAnchor, targetPoint);
  const replyId = stationDistance < seekerDistance ? "closer" : "further";
  return resultFromReplyId(pending, replyId);
}

async function truthMeasuringSeaLevel(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
): Promise<HiderTruthResult | null> {
  const metadata = pending.placement.metadata;
  const seekerAnchor = seekerAnchorFromMetadata(metadata);
  const seekerAltitude = metadata.measuringAnchorAltitudeMeters;

  if (!seekerAnchor || typeof seekerAltitude !== "number") {
    return truthUnavailable();
  }

  try {
    const [stationAltitude] = await fetchElevations([stationCenter]);
    if (stationAltitude === undefined || !Number.isFinite(stationAltitude)) {
      return truthUnavailable();
    }

    const replyId =
      stationAltitude < seekerAltitude ? "closer" : "further";
    return resultFromReplyId(pending, replyId);
  } catch {
    return truthUnavailable();
  }
}

function truthTentacle(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
): HiderTruthResult | null {
  const metadata = pending.placement.metadata;
  const poisJson = metadata.poisJson;
  const centerJson = metadata.centerJson;

  if (typeof poisJson !== "string" || typeof centerJson !== "string") {
    return truthUnavailable();
  }

  let anchor: LatLngTuple;
  let pois: TentaclePoi[];
  try {
    const center = JSON.parse(centerJson) as { lat: number; lng: number };
    anchor = [center.lat, center.lng];
    pois = JSON.parse(poisJson) as TentaclePoi[];
  } catch {
    return truthUnavailable();
  }

  const radiusMeters = tentacleRadiusFromMetadata(metadata, DEFAULT_RADIUS_METERS);
  const distanceToAnchor = distanceBetweenPoints(stationCenter, anchor);
  if (distanceToAnchor > radiusMeters) {
    return resultFromReplyId(pending, "out-of-reach");
  }

  if (pois.length === 0) {
    return truthUnavailable();
  }

  let nearest: TentaclePoi | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const poi of pois) {
    const distanceMeters = distanceBetweenPoints(stationCenter, [
      poi.lat,
      poi.lng,
    ]);
    if (distanceMeters < nearestDistance) {
      nearestDistance = distanceMeters;
      nearest = poi;
    }
  }

  if (!nearest) {
    return truthUnavailable();
  }

  return resultFromReplyId(pending, nearest.id);
}

export function computeHiderTruthReply(
  pending: PendingQuestionRecord,
  /** Confirmed hiding-zone center (station location). Never live GPS. */
  stationCenter: LatLngTuple | null,
): HiderTruthResult | null {
  if (!stationCenter) {
    return truthUnavailable(UNAVAILABLE_NO_ZONE);
  }

  switch (pending.toolType) {
    case "radar":
      return truthRadar(pending, stationCenter);
    case "thermometer":
      return truthThermometer(pending, stationCenter);
    case "matching":
      return truthMatching(pending, stationCenter);
    case "measuring":
      return truthMeasuringSync(pending, stationCenter);
    case "tentacle":
      return truthTentacle(pending, stationCenter);
    default:
      return truthUnavailable();
  }
}

export async function computeHiderTruthReplyAsync(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple | null,
): Promise<HiderTruthResult | null> {
  if (!stationCenter) {
    return truthUnavailable(UNAVAILABLE_NO_ZONE);
  }

  if (pending.toolType === "measuring") {
    const metadata = pending.placement.metadata;
    if (metadata.measuringSubject === "sea_level") {
      return truthMeasuringSeaLevel(pending, stationCenter);
    }
  }

  if (pending.toolType === "matching") {
    return truthMatchingAsync(pending, stationCenter);
  }

  return computeHiderTruthReply(pending, stationCenter);
}
