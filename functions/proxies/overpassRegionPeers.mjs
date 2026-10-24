/**
 * @typedef {{ south: number, west: number, north: number, east: number }} OverpassBbox
 * @typedef {{ id: "ch" | "bi", host: string, interpreterUrl: string, bbox: OverpassBbox }} RegionCoverage
 */

/** @type {readonly RegionCoverage[]} */
export const OVERPASS_REGION_COVERAGES = Object.freeze([
  {
    id: "ch",
    host: "overpass.osm.ch",
    interpreterUrl: "https://overpass.osm.ch/api/interpreter",
    bbox: { south: 45.8, west: 5.9, north: 47.9, east: 10.6 },
  },
  // BI gated out: IPv6-only host failed connect from probe network (2026-10-06).
]);

/**
 * @param {string} query
 * @returns {OverpassBbox | null}
 */
export function parseOverpassQueryBbox(query) {
  const match = String(query).match(
    /\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/,
  );
  if (!match) {
    return null;
  }
  const south = Number(match[1]);
  const west = Number(match[2]);
  const north = Number(match[3]);
  const east = Number(match[4]);
  if (![south, west, north, east].every((n) => Number.isFinite(n))) {
    return null;
  }
  if (south >= north || west >= east) {
    return null;
  }
  return { south, west, north, east };
}

/**
 * @param {OverpassBbox} inner
 * @param {OverpassBbox} outer
 * @returns {boolean}
 */
export function bboxFullyInside(inner, outer) {
  return (
    inner.south >= outer.south &&
    inner.west >= outer.west &&
    inner.north <= outer.north &&
    inner.east <= outer.east
  );
}

/**
 * @param {OverpassBbox | null} bbox
 * @returns {string[]}
 */
export function regionalOverpassEndpointsForBbox(bbox) {
  if (!bbox) {
    return [];
  }
  return OVERPASS_REGION_COVERAGES.filter((region) => bboxFullyInside(bbox, region.bbox)).map(
    (region) => region.interpreterUrl,
  );
}
