import type { MatchingFeature } from "@/domain/geo/types";
import {
  type BoundingBox,
  intersectBoundingBoxes,
} from "@/domain/geometry/gameArea/gameAreaBounds";
import { gameAreaToBoundingBox } from "@/domain/geometry/gameArea/geometry";
import type { GameArea } from "@/domain/map/annotations";
import type { MapViewportBounds } from "@/domain/map/transitViewport";
import { dedupeTransitStations, type TransitStation } from "@/domain/session/hiding/hidingZone";
import { queryOverpass } from "../../core/overpass/overpassClient";
import { withTimeout } from "../../core/withTimeout";
import {
  filterGtfsStopsForBoundingBox,
  filterGtfsStopsForGameArea,
  gtfsStopsToMatchingFeatures,
  gtfsStopsToTransitStations,
  loadGtfsBundle,
} from "../../transit/gtfsRouteGraph";
import { inferTransitMetroId } from "../../transit/transitCatalog";
import {
  buildHidingZoneTransitStopOverpassQuery,
  buildTransitStopOverpassQuery,
  type OverpassTransitStopElement,
  overpassTransitStopsToMatchingFeatures,
  parseOverpassTransitStops,
} from "../../transit/transitStops";
import { parseMatchingFeatures } from "./parse";
import { buildStreetPathQuery, matchingSearchBoundingBox } from "./query";
import type { OverpassElement } from "./types";

/** UX bound for Overpass only; GTFS bundle load stays on GEO_FETCH_TIMEOUT_MS. */
export const HIDING_ZONE_OVERPASS_TIMEOUT_MS = 4000;

const OVERPASS_TIMEOUT_MESSAGE = "Couldn't load transit stations for this area.";

export type HidingZoneStationsOptions = {
  /** Fired for GTFS hits and for late Overpass results after a timed-out wait. */
  onStations?: (stations: TransitStation[]) => void;
};

function buildStationQuery(gameArea: GameArea): string {
  return buildTransitStopOverpassQuery(matchingSearchBoundingBox(gameArea));
}

function overpassStopsToMatchingFeatures(
  elements: readonly OverpassTransitStopElement[],
  gameArea: GameArea,
): MatchingFeature[] {
  return overpassTransitStopsToMatchingFeatures(elements, gameArea).map((station) => ({
    id: station.id,
    name: station.name,
    point: station.point,
    inPlayArea: true,
  }));
}

async function tryHidingZoneGtfsStations(
  gameArea: GameArea,
  bbox: BoundingBox,
): Promise<TransitStation[] | null> {
  const metroId = inferTransitMetroId(gameArea);
  if (!metroId) {
    return null;
  }

  const bundle = await loadGtfsBundle(metroId);
  if (!bundle) {
    return null;
  }

  const stops = filterGtfsStopsForBoundingBox(bundle, bbox);
  const stations = dedupeTransitStations(gtfsStopsToTransitStations(stops, gameArea));
  return stations.length > 0 ? stations : null;
}

async function fetchOverpassHidingZoneStations(
  bbox: BoundingBox,
  gameArea: GameArea,
  options?: HidingZoneStationsOptions,
): Promise<TransitStation[]> {
  const overpassLookup = queryOverpass<{ elements: OverpassTransitStopElement[] }>(
    buildHidingZoneTransitStopOverpassQuery(bbox),
  ).then((payload) => parseOverpassTransitStops(payload.elements, gameArea));

  const tracked = overpassLookup.then((stations) => {
    if (stations.length > 0) {
      options?.onStations?.(stations);
    }
    return stations;
  });

  try {
    return await withTimeout(tracked, HIDING_ZONE_OVERPASS_TIMEOUT_MS, OVERPASS_TIMEOUT_MESSAGE);
  } catch (error) {
    if (error instanceof Error && error.message === OVERPASS_TIMEOUT_MESSAGE) {
      throw error;
    }
    throw error instanceof Error ? error : new Error(OVERPASS_TIMEOUT_MESSAGE);
  }
}

export async function fetchStationFeaturesInArea(gameArea: GameArea): Promise<MatchingFeature[]> {
  const payload = await queryOverpass<{ elements: OverpassTransitStopElement[] }>(
    buildStationQuery(gameArea),
  );

  return overpassStopsToMatchingFeatures(payload.elements, gameArea);
}

export async function fetchTransitLineMatchingFeaturesInArea(
  gameArea: GameArea,
): Promise<MatchingFeature[]> {
  const metroId = inferTransitMetroId(gameArea);
  if (metroId) {
    const bundle = await loadGtfsBundle(metroId);
    if (bundle) {
      const stops = filterGtfsStopsForGameArea(bundle, gameArea);
      if (stops.length > 0) {
        return gtfsStopsToMatchingFeatures(stops, gameArea);
      }
    }
  }

  return fetchStationFeaturesInArea(gameArea);
}

export async function fetchTransitStationsForHidingZone(
  gameArea: GameArea,
  options?: HidingZoneStationsOptions,
): Promise<TransitStation[]> {
  const bbox = matchingSearchBoundingBox(gameArea);
  const gtfs = await tryHidingZoneGtfsStations(gameArea, bbox);
  if (gtfs) {
    options?.onStations?.(gtfs);
    return gtfs;
  }

  return fetchOverpassHidingZoneStations(bbox, gameArea, options);
}

export async function fetchTransitStationsForHidingZoneViewport(
  viewport: MapViewportBounds,
  gameArea: GameArea,
  options?: HidingZoneStationsOptions,
): Promise<TransitStation[]> {
  const gameAreaBox = gameAreaToBoundingBox(gameArea);
  const clipped = intersectBoundingBoxes(viewport, gameAreaBox);

  if (!clipped) {
    return [];
  }

  const gtfs = await tryHidingZoneGtfsStations(gameArea, clipped);
  if (gtfs) {
    options?.onStations?.(gtfs);
    return gtfs;
  }

  return fetchOverpassHidingZoneStations(clipped, gameArea, options);
}

export async function fetchStreetPathFeaturesInArea(
  gameArea: GameArea,
): Promise<MatchingFeature[]> {
  const payload = await queryOverpass<{ elements: OverpassElement[] }>(
    buildStreetPathQuery(gameArea),
  );

  return parseMatchingFeatures(payload.elements, gameArea, "street_or_path");
}
