import type {
  Feature,
  LineString,
  Polygon as GeoPolygon,
  MultiPolygon,
} from "geojson";
import type { GameArea } from "../../domain/annotations";
import type { LatLngTuple } from "../../domain/geometry";
import {
  isMeasuringLinearLocation,
  measuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringSubject,
} from "../../domain/measuringQuestions";
import { loadCoastlineContext } from "../../services/coastline";
import {
  findNearestMeasuringPlace,
  measuringPlaceNotFoundMessage,
  MEASURING_MAP_SNAP_RADIUS_METERS,
} from "../../services/measuringPlaces";
import {
  loadMeasuringLinearContext,
  measuringLinearNotFoundMessage,
} from "../../services/measuringLinearFeatures";
import { loadSeaLevelContext } from "../../services/seaLevel";

export async function fetchMeasuringSeaLevelContext(
  seekerPoint: LatLngTuple,
  gameArea: GameArea,
) {
  const result = await loadSeaLevelContext(seekerPoint, gameArea);
  if (!result) {
    return {
      ok: false as const,
      message: "Unable to build a sea level region for this play area.",
    };
  }

  return {
    ok: true as const,
    seekerElevationMeters: result.seekerElevationMeters,
    distanceFromSeaLevelMeters: result.distanceFromSeaLevelMeters,
    nearRegion: result.nearRegion,
  };
}

export async function fetchMeasuringCoastlineContext(
  seekerPoint: LatLngTuple,
  gameArea: GameArea,
) {
  const result = await loadCoastlineContext(seekerPoint, gameArea);
  if (!result) {
    return {
      ok: false as const,
      message:
        "No coastline in this play area under the game definition. Per Jet Lag rules, this is a null answer.",
    };
  }

  return {
    ok: true as const,
    coastPoint: result.coastPoint,
    distanceMeters: result.distanceMeters,
    segments: result.segments,
  };
}

export async function fetchMeasuringLinearContext(
  seekerPoint: LatLngTuple,
  gameArea: GameArea,
  subject: MeasuringSubject,
  locationCategory: MeasuringLocationCategory,
) {
  const kind = measuringFromKind(subject, locationCategory);
  if (!isMeasuringLinearLocation(subject, locationCategory)) {
    return {
      ok: false as const,
      message: measuringLinearNotFoundMessage(kind),
    };
  }

  const result = await loadMeasuringLinearContext(seekerPoint, gameArea, kind);
  if (!result) {
    return {
      ok: false as const,
      message: measuringLinearNotFoundMessage(kind),
    };
  }

  return {
    ok: true as const,
    point: result.point,
    distanceMeters: result.distanceMeters,
    segments: result.segments,
  };
}

export async function fetchMeasuringMapTarget(
  point: LatLngTuple,
  gameArea: GameArea,
  locationCategory: MeasuringLocationCategory,
) {
  const nearest = await findNearestMeasuringPlace(
    point,
    gameArea,
    locationCategory,
    { maxDistanceMeters: MEASURING_MAP_SNAP_RADIUS_METERS },
  );

  if (!nearest) {
    return {
      ok: false as const,
      message: measuringPlaceNotFoundMessage(locationCategory, true),
    };
  }

  return {
    ok: true as const,
    point: nearest.point,
    name: nearest.name,
  };
}

export async function fetchNearestMeasuringPlace(
  seekerPoint: LatLngTuple,
  gameArea: GameArea,
  locationCategory: MeasuringLocationCategory,
) {
  const nearest = await findNearestMeasuringPlace(
    seekerPoint,
    gameArea,
    locationCategory,
  );

  if (!nearest) {
    return {
      ok: false as const,
      message: measuringPlaceNotFoundMessage(locationCategory),
    };
  }

  return {
    ok: true as const,
    point: nearest.point,
    name: nearest.name,
    distanceMeters: nearest.distanceMeters,
  };
}

export type MeasuringCoastSegments = Feature<LineString>[];
export type MeasuringNearRegion = Feature<GeoPolygon | MultiPolygon> | null;
