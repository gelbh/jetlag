import type { MatchingFeature } from "@/domain/geo/types";
import { intersectBoundingBoxes } from "@/domain/geometry/gameArea/gameAreaBounds";
import { gameAreaToBoundingBox } from "@/domain/geometry/gameArea/geometry";
import type { GameArea } from "@/domain/map/annotations";
import type { MapViewportBounds } from "@/domain/map/transitViewport";
import type { TransitStation } from "@/domain/session/hiding/hidingZone";
import { queryOverpass } from "../../core/overpass/overpassClient";
import {
  filterGtfsStopsForGameArea,
  gtfsStopsToMatchingFeatures,
  loadGtfsBundle,
} from "../../transit/gtfsRouteGraph";
import { inferTransitMetroId } from "../../transit/transitCatalog";
import {
  buildTransitStopOverpassQuery,
  type OverpassTransitStopElement,
  overpassTransitStopsToMatchingFeatures,
  parseOverpassTransitStops,
} from "../../transit/transitStops";
import type { OverpassLoad } from "../overpass/overpassLoad";
import { parseMatchingFeatures } from "./parse";
import { buildStreetPathQuery, matchingSearchBoundingBox } from "./query";
import type { OverpassElement } from "./types";

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

  return fetchStationFeaturesInArea(gameArea, load);
}

export async function fetchTransitStationsForHidingZone(
  gameArea: GameArea,
): Promise<TransitStation[]> {
  const payload = await queryOverpass<{ elements: OverpassTransitStopElement[] }>(
    buildStationQuery(gameArea),
  );

  return parseOverpassTransitStops(payload.elements, gameArea);
}

export async function fetchTransitStationsForHidingZoneViewport(
  viewport: MapViewportBounds,
  gameArea: GameArea,
  load?: OverpassLoad,
): Promise<TransitStation[]> {
  const gameAreaBox = gameAreaToBoundingBox(gameArea);
  const clipped = intersectBoundingBoxes(viewport, gameAreaBox);

  if (!clipped) {
    return [];
  }

  const payload = await queryOverpass<{ elements: OverpassTransitStopElement[] }>(
    buildTransitStopOverpassQuery(clipped),
    load,
  );

  return parseOverpassTransitStops(payload.elements, gameArea);
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
