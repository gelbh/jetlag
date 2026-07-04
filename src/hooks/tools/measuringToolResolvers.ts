import type {
  Feature,
  LineString,
  Polygon as GeoPolygon,
  MultiPolygon,
} from "geojson";
import type { GameArea } from "../../domain/annotations";
import type { LatLngTuple } from "../../domain/geometry";
import type { SeaLevelEdgeCase } from "../../domain/seaLevel";
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

const SEA_LEVEL_LOWEST_MESSAGE =
  "You're at the lowest elevation in this play area—a \"closer\" answer may be impossible.";

const SEA_LEVEL_HIGHEST_NOTE =
  "You're at the highest elevation in this play area—a \"further\" answer may be impossible.";

export async function fetchMeasuringSeaLevelContext(
  seekerPoint: LatLngTuple,
  gameArea: GameArea,
) {
  const result = await loadSeaLevelContext(seekerPoint, gameArea);

  if (!result) {
    return {
      ok: false as const,
      message:
        "Unable to read elevation at your anchor. Try a nearby point or retry in a moment.",
    };
  }

  if ("reason" in result) {
    return {
      ok: false as const,
      message:
        result.reason === "lowest"
          ? SEA_LEVEL_LOWEST_MESSAGE
          : "Unable to build a sea level region for this play area.",
    };
  }

  return {
    ok: true as const,
    seekerElevationMeters: result.seekerElevationMeters,
    distanceFromSeaLevelMeters: result.distanceFromSeaLevelMeters,
    nearRegion: result.nearRegion,
    edgeCase: result.edgeCase,
    note:
      result.edgeCase === "highest" ? SEA_LEVEL_HIGHEST_NOTE : null,
  };
}

export type MeasuringSeaLevelEdgeCase = SeaLevelEdgeCase;

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
