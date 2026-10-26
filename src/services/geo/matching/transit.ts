import type { MatchingFeature } from "@/domain/geo/types";
import {
  type BoundingBox,
  intersectBoundingBoxes,
} from "@/domain/geometry/gameArea/gameAreaBounds";
import { gameAreaToBoundingBox } from "@/domain/geometry/gameArea/geometry";
import type { GameArea } from "@/domain/map/annotations";
import type { MapViewportBounds } from "@/domain/map/transitViewport";
import { dedupeTransitStations, type TransitStation } from "@/domain/session/hiding/hidingZone";
import { throwIfAborted } from "../../core/network/anySignal";
import { queryOverpass } from "../../core/overpass/overpassClient";
import { withTimeout } from "../../core/withTimeout";
import {
  fetchGtfsHidingZoneStations,
  fetchGtfsMatchingStationsForPlayArea,
  type GtfsStationQuery,
} from "../../transit/gtfsPlayAreaStations";
import {
  buildHidingZoneTransitStopOverpassQuery,
  buildTransitStopOverpassQuery,
  type OverpassTransitStopElement,
  overpassTransitStopsToMatchingFeatures,
  parseOverpassTransitStops,
} from "../../transit/transitStops";
import type { OverpassLoad } from "../overpass/overpassLoad";
import { notifyOverpassPriorityChanged } from "../overpass/requestQueue";
import { parseMatchingFeatures } from "./parse";
import { buildStreetPathQuery, matchingSearchBoundingBox } from "./query";
import type { OverpassElement } from "./types";

export const HIDING_ZONE_OVERPASS_TIMEOUT_MS = 4000;

const OVERPASS_TIMEOUT_MESSAGE = "Couldn't load transit stations for this area.";

export type HidingZoneStationsOptions = GtfsStationQuery & {
  onStations?: (stations: TransitStation[]) => void;
  /** Cancel, lane and progress for the Overpass lookup. */
  load?: OverpassLoad;
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
  query?: GtfsStationQuery,
): Promise<TransitStation[] | null> {
  const stations = await fetchGtfsHidingZoneStations(gameArea, bbox, query);
  if (stations === null) {
    return null;
  }
  return dedupeTransitStations(stations);
}

async function fetchOverpassHidingZoneStations(
  bbox: BoundingBox,
  gameArea: GameArea,
  options?: HidingZoneStationsOptions,
): Promise<TransitStation[]> {
  // After the timeout the lookup keeps running so late stations still arrive via
  // onStations, but it drops to the background lane so it never blocks a new question.
  let timedOut = false;
  const basePriority = options?.load?.priority;
  const overpassLookup = queryOverpass<{ elements: OverpassTransitStopElement[] }>(
    buildHidingZoneTransitStopOverpassQuery(bbox),
    {
      ...options?.load,
      priority: () =>
        timedOut
          ? "background"
          : typeof basePriority === "function"
            ? basePriority()
            : (basePriority ?? "foreground"),
    },
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
      timedOut = true;
      notifyOverpassPriorityChanged();
      throw error;
    }
    throw error instanceof Error ? error : new Error(OVERPASS_TIMEOUT_MESSAGE);
  }
}

export async function fetchStationFeaturesInArea(
  gameArea: GameArea,
  load?: OverpassLoad,
): Promise<MatchingFeature[]> {
  const payload = await queryOverpass<{ elements: OverpassTransitStopElement[] }>(
    buildStationQuery(gameArea),
    load,
  );

  return overpassStopsToMatchingFeatures(payload.elements, gameArea);
}

export async function fetchTransitLineMatchingFeaturesInArea(
  gameArea: GameArea,
  load?: OverpassLoad,
  query?: GtfsStationQuery,
): Promise<MatchingFeature[]> {
  const gtfsFeatures = await fetchGtfsMatchingStationsForPlayArea(gameArea, query);
  if (gtfsFeatures !== null) {
    return gtfsFeatures;
  }

  return fetchStationFeaturesInArea(gameArea, load);
}

async function fetchHidingZoneStationsUnion(
  bbox: BoundingBox,
  gameArea: GameArea,
  options?: HidingZoneStationsOptions,
): Promise<TransitStation[]> {
  const gtfsQuery: GtfsStationQuery = {
    transitMetroId: options?.transitMetroId,
    transitStationFilter: options?.transitStationFilter,
  };
  const filter = options?.transitStationFilter ?? "all";
  const gtfsPromise = tryHidingZoneGtfsStations(gameArea, bbox, gtfsQuery);
  // Mode filter + GTFS available: do not union unfiltered Overpass (would reintroduce other modes).
  if (filter !== "all") {
    const gtfsStations = await gtfsPromise;
    if (gtfsStations !== null) {
      if (gtfsStations.length > 0) {
        options?.onStations?.(gtfsStations);
      }
      return gtfsStations;
    }
  }

  const overpassPromise = fetchOverpassHidingZoneStations(bbox, gameArea, options);
  const [gtfsResult, overpassResult] = await Promise.allSettled([
    gtfsPromise.then((stations) => stations ?? []),
    overpassPromise,
  ]);
  // A Cancel rejects only the Overpass half; the GTFS half must not be applied either.
  throwIfAborted(options?.load?.signal);

  const gtfs = gtfsResult.status === "fulfilled" ? gtfsResult.value : [];
  const overpass = overpassResult.status === "fulfilled" ? overpassResult.value : [];

  if (gtfs.length === 0 && overpass.length === 0) {
    if (overpassResult.status === "rejected") {
      throw overpassResult.reason;
    }
    return [];
  }

  // GTFS first so name/proximity dedupe keeps agency ids over OSM ids.
  const merged = dedupeTransitStations([...gtfs, ...overpass]);
  if (merged.length > 0) {
    options?.onStations?.(merged);
  }
  return merged;
}

export async function fetchTransitStationsForHidingZone(
  gameArea: GameArea,
  options?: HidingZoneStationsOptions,
): Promise<TransitStation[]> {
  return fetchHidingZoneStationsUnion(matchingSearchBoundingBox(gameArea), gameArea, options);
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

  return fetchHidingZoneStationsUnion(clipped, gameArea, options);
}

export async function fetchStreetPathFeaturesInArea(
  gameArea: GameArea,
  load?: OverpassLoad,
): Promise<MatchingFeature[]> {
  const payload = await queryOverpass<{ elements: OverpassElement[] }>(
    buildStreetPathQuery(gameArea),
    load,
  );

  return parseMatchingFeatures(payload.elements, gameArea, "street_or_path");
}
