/**
 * Heuristic Overpass QL → Postpass family classification.
 *
 * @typedef {{
 *   family: "admin" | "landmass" | "coastline" | "metro" | "around" | "linear" | "places",
 *   meta: Record<string, unknown>,
 * }} PostpassClassification
 */

/**
 * @param {string} ql
 * @returns {{ south: number, west: number, north: number, east: number } | null}
 */
export function extractOverpassBbox(ql) {
  // Overpass bbox filters: (south,west,north,east)
  const match = String(ql).match(
    /\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/,
  );
  if (!match) {
    return null;
  }
  const south = Number(match[1]);
  const west = Number(match[2]);
  const north = Number(match[3]);
  const east = Number(match[4]);
  if (![south, west, north, east].every(Number.isFinite)) {
    return null;
  }
  return { south, west, north, east };
}

/**
 * @param {string} ql
 * @returns {{ radiusMeters: number, lat: number, lon: number } | null}
 */
export function extractAround(ql) {
  const match = String(ql).match(
    /around\s*:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
  );
  if (!match) {
    return null;
  }
  const radiusMeters = Number(match[1]);
  const lat = Number(match[2]);
  const lon = Number(match[3]);
  if (![radiusMeters, lat, lon].every(Number.isFinite)) {
    return null;
  }
  return { radiusMeters, lat, lon };
}

/**
 * @param {string} ql
 * @returns {Array<{ key: string, op: "eq" | "regex", value: string }>}
 */
export function extractTagPredicates(ql) {
  /** @type {Array<{ key: string, op: "eq" | "regex", value: string }>} */
  const preds = [];
  const re = /\["([^"\\]+)"\s*(=|~)\s*"([^"\\]*)"\]/g;
  let match;
  while ((match = re.exec(ql)) != null) {
    preds.push({
      key: match[1],
      op: match[2] === "~" ? "regex" : "eq",
      value: match[3],
    });
  }
  return preds;
}

/**
 * @param {string} ql
 * @returns {PostpassClassification | null}
 */
export function classifyOverpassQuery(ql) {
  const text = String(ql);
  const tags = extractTagPredicates(text);
  const bbox = extractOverpassBbox(text);
  const around = extractAround(text);

  if (
    text.includes('natural"="water"') &&
    (text.includes("waterway") || text.includes("place"))
  ) {
    return { family: "landmass", meta: { bbox, tags, around } };
  }

  if (text.includes('natural"="coastline"')) {
    return { family: "coastline", meta: { bbox, tags, around } };
  }

  if (/route\s*~\s*"subway/i.test(text) || text.includes('route"~"subway')) {
    return { family: "metro", meta: { around, bbox, tags } };
  }

  // Measuring linear borders use way["boundary"="administrative"]… + out geom.
  // Admin-division uses relation["boundary"="administrative"]… — require relation.
  const isAdminRelation =
    /relation\s*\[\s*"boundary"\s*=\s*"administrative"/i.test(text) &&
    text.includes("admin_level");
  const isLinearWayGeom =
    /\bout\s+geom\b/i.test(text) &&
    /way\s*\[/.test(text) &&
    !text.includes('natural"="water"') &&
    !text.includes('natural"="coastline"');

  if (isLinearWayGeom && !isAdminRelation) {
    return { family: "linear", meta: { bbox, tags } };
  }

  if (isAdminRelation) {
    const adminPred = tags.find((p) => p.key === "admin_level" && p.op === "eq");
    return {
      family: "admin",
      meta: {
        adminLevel: adminPred?.value ?? null,
        bbox,
        tags,
      },
    };
  }

  if (around) {
    return { family: "around", meta: { around, tags, bbox } };
  }

  if (isLinearWayGeom) {
    return { family: "linear", meta: { bbox, tags } };
  }

  if (/\bout\s+center\b/i.test(text)) {
    return { family: "places", meta: { bbox, tags, around } };
  }

  return null;
}
