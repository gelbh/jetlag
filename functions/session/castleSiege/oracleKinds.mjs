import { bearingDegrees, haversineMeters } from "./haversine.mjs";

/** 8-point compass answers (thin CS question shape; mirrors client compassAsk). */
export const COMPASS_CARDINALS = Object.freeze(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]);

/**
 * @param {number} bearingDeg
 * @returns {(typeof COMPASS_CARDINALS)[number]}
 */
export function bearingToCompassCardinal(bearingDeg) {
  const normalized = ((bearingDeg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return COMPASS_CARDINALS[index];
}

function requirePoint(point, label) {
  const lat = point?.lat;
  const lng = point?.lng;
  if (
    typeof lat !== "number" ||
    !Number.isFinite(lat) ||
    typeof lng !== "number" ||
    !Number.isFinite(lng)
  ) {
    throw new Error(`Invalid ${label}: lat/lng required.`);
  }
  return { lat, lng };
}

/**
 * Matching: nearest feature (by point) to sealed anchor vs seekerFeatureId.
 * @returns {{ kind: "matching", answer: "yes" | "no" | "null" }}
 */
export function answerMatchingOracle(seal, ask) {
  const features = Array.isArray(ask?.features) ? ask.features : null;
  if (!features) {
    throw new Error("Invalid matching ask: features array required.");
  }

  if (features.length === 0) {
    return { kind: "matching", answer: "null" };
  }

  let nearestId = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const feature of features) {
    if (!feature || typeof feature.id !== "string" || feature.id.length === 0) {
      continue;
    }
    const point = requirePoint(feature, "matching feature");
    const distance = haversineMeters(seal.lat, seal.lng, point.lat, point.lng);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestId = feature.id;
    }
  }

  if (!nearestId) {
    return { kind: "matching", answer: "null" };
  }

  const seekerFeatureId = ask.seekerFeatureId;
  if (typeof seekerFeatureId !== "string" || seekerFeatureId.length === 0) {
    return { kind: "matching", answer: "null" };
  }

  return {
    kind: "matching",
    answer: nearestId === seekerFeatureId ? "yes" : "no",
  };
}

/**
 * Measuring: closer/further to target than the seeker (point target only).
 * @returns {{ kind: "measuring", answer: "closer" | "further" }}
 */
export function answerMeasuringOracle(seal, ask) {
  const seeker = requirePoint(ask?.seekerPoint, "measuring seekerPoint");
  const target = requirePoint(ask?.targetPoint, "measuring targetPoint");

  const sealDistance = haversineMeters(seal.lat, seal.lng, target.lat, target.lng);
  const seekerDistance = haversineMeters(seeker.lat, seeker.lng, target.lat, target.lng);

  return {
    kind: "measuring",
    answer: sealDistance < seekerDistance ? "closer" : "further",
  };
}

/**
 * Tentacle: nearest POI id within radius of ask center, else out-of-reach.
 * @returns {{ kind: "tentacle", answer: string }}
 */
export function answerTentacleOracle(seal, ask) {
  const center = requirePoint(ask?.center, "tentacle center");
  const radiusMeters = ask?.radiusMeters;
  if (typeof radiusMeters !== "number" || !Number.isFinite(radiusMeters) || radiusMeters < 0) {
    throw new Error("Invalid tentacle ask: radiusMeters required.");
  }

  const pois = Array.isArray(ask?.pois) ? ask.pois : null;
  if (!pois) {
    throw new Error("Invalid tentacle ask: pois array required.");
  }

  const distanceToCenter = haversineMeters(seal.lat, seal.lng, center.lat, center.lng);
  if (distanceToCenter > radiusMeters) {
    return { kind: "tentacle", answer: "out-of-reach" };
  }

  let nearestId = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const poi of pois) {
    if (!poi || typeof poi.id !== "string" || poi.id.length === 0) {
      continue;
    }
    const point = requirePoint(poi, "tentacle poi");
    const distance = haversineMeters(seal.lat, seal.lng, point.lat, point.lng);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestId = poi.id;
    }
  }

  if (!nearestId) {
    throw new Error("Invalid tentacle ask: no usable pois.");
  }

  return { kind: "tentacle", answer: nearestId };
}

/**
 * Photo-mirror obligation: defenders mirror the same category (no coords).
 * @returns {{ kind: "photo", answer: "mirror", mirror: { required: true, categoryId: string } }}
 */
export function answerPhotoMirrorOracle(ask) {
  const categoryId = ask?.categoryId;
  if (typeof categoryId !== "string" || categoryId.length === 0) {
    throw new Error("Invalid photo ask: categoryId required.");
  }
  return {
    kind: "photo",
    answer: "mirror",
    mirror: { required: true, categoryId },
  };
}

/**
 * Compass: 8-point cardinal from ask point toward sealed anchor.
 * @returns {{ kind: "compass", answer: string }}
 */
export function answerCompassOracle(seal, ask) {
  const point = requirePoint(ask?.point, "compass point");
  const bearing = bearingDegrees(point.lat, point.lng, seal.lat, seal.lng);
  return {
    kind: "compass",
    answer: bearingToCompassCardinal(bearing),
  };
}
