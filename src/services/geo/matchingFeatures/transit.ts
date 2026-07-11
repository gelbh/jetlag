import type { GameArea } from "../../../domain/map/annotations";
import type { TransitStation } from "../../../domain/session/hidingZone";
import { gameAreaToBoundingBox } from "../../../domain/geometry/geometry";
import { intersectBoundingBoxes } from "../../../domain/geometry/gameAreaBounds";
import type { MatchingFeature } from "../../../domain/geo/types";
import type { MapViewportBounds } from "../../../domain/map/transitViewport";
import { queryOverpass } from "../../core/overpassClient";
import {
  buildTransitStopOverpassQuery,
  overpassTransitStopsToMatchingFeatures,
  parseOverpassTransitStops,
  type OverpassTransitStopElement,
} from "../../transit/transitStops";
import { inferTransitMetroId } from "../../transit/transitCatalog";
import {
  filterGtfsStopsForGameArea,
  gtfsStopsToMatchingFeatures,
  loadGtfsBundle,
} from "../../transit/gtfsRouteGraph";
import { buildStreetPathQuery, matchingSearchBoundingBox } from "./query";
import { parseMatchingFeatures } from "./parse";
import type { OverpassElement } from "./types";

function buildStationQuery(gameArea: GameArea): string {
  return buildTransitStopOverpassQuery(
    matchingSearchBoundingBox(gameArea, "station_name_length"),
  );
}

function overpassStopsToMatchingFeatures(
  elements: readonly OverpassTransitStopElement[],
  gameArea: GameArea,
): MatchingFeature[] {
  return overpassTransitStopsToMatchingFeatures(elements, gameArea).map(
    (station) => ({
      id: station.id,
      name: station.name,
      point: station.point,
      inPlayArea: true,
    }),
  );
}

export async function fetchStationFeaturesInArea(
  gameArea: GameArea,
): Promise<MatchingFeature[]> {
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
): Promise<TransitStation[]> {
  const payload = await queryOverpass<{ elements: OverpassTransitStopElement[] }>(
    buildStationQuery(gameArea),
  );

  return parseOverpassTransitStops(payload.elements, gameArea);
}

export async function fetchTransitStationsForHidingZoneViewport(
  viewport: MapViewportBounds,
  gameArea: GameArea,
): Promise<TransitStation[]> {
  const gameAreaBox = gameAreaToBoundingBox(gameArea);
  const clipped = intersectBoundingBoxes(viewport, gameAreaBox);

  if (!clipped) {
    return [];
  }

  const payload = await queryOverpass<{ elements: OverpassTransitStopElement[] }>(
    buildTransitStopOverpassQuery(clipped),
  );

  return parseOverpassTransitStops(payload.elements, gameArea);
}

export async function fetchStreetPathFeaturesInArea(
  gameArea: GameArea,
): Promise<MatchingFeature[]> {
  const payload = await queryOverpass<{ elements: OverpassElement[] }>(
    buildStreetPathQuery(gameArea),
  );

  return parseMatchingFeatures(payload.elements, gameArea, "street_or_path");
}
