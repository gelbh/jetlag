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
  let match = re.exec(ql);
  while (match != null) {
    preds.push({
      key: match[1],
      op: match[2] === "~" ? "regex" : "eq",
      value: match[3],
    });
    match = re.exec(ql);
  }
  return preds;
}

/**
 * @typedef {{ key: string, op: "eq" | "regex" | "iregex" | "exists", value?: string }} OverpassFilter
 */

const OVERPASS_STATEMENT_RE =
  /\b(?:node|way|relation|nwr)\b(?:\s*\(\s*around\s*:[^)]*\))?\s*((?:\[[^\]]*\]\s*)+)/g;

// Quoted ("…", no escapes) or bare Overpass identifier.
const FILTER_TOKEN = String.raw`(?:"([^"\\]*)"|([A-Za-z0-9_]+))`;
const FILTER_EXISTS_RE = new RegExp(String.raw`^\[\s*${FILTER_TOKEN}\s*\]$`);
const FILTER_COMPARE_RE = new RegExp(
  String.raw`^\[\s*${FILTER_TOKEN}\s*(=|~)\s*${FILTER_TOKEN}\s*(,\s*i\s*)?\]$`,
);

/**
 * Strict: negation, key regex, escaped quotes, or `=…,i` return null so callers fail closed.
 *
 * @param {string} raw
 * @returns {OverpassFilter | null}
 */
export function parseOverpassFilter(raw) {
  const exists = raw.match(FILTER_EXISTS_RE);
  if (exists) {
    const key = exists[1] ?? exists[2];
    return key ? { key, op: "exists" } : null;
  }
  const match = raw.match(FILTER_COMPARE_RE);
  if (!match) {
    return null;
  }
  const [, quotedKey, bareKey, operator, quotedValue, bareValue, caseInsensitive] = match;
  const key = quotedKey ?? bareKey;
  const value = quotedValue ?? bareValue;
  if (!key) {
    return null;
  }
  if (operator === "=") {
    return caseInsensitive ? null : { key, op: "eq", value };
  }
  return { key, op: caseInsensitive ? "iregex" : "regex", value };
}

/**
 * Overpass union statements → OR of clauses; filters within a statement are ANDed.
 *
 * @param {string} ql
 * @returns {OverpassFilter[][] | null}
 */
export function extractClauses(ql) {
  /** @type {Map<string, OverpassFilter[]>} */
  const unique = new Map();
  for (const statement of String(ql).matchAll(OVERPASS_STATEMENT_RE)) {
    /** @type {OverpassFilter[]} */
    const clause = [];
    for (const raw of statement[1].match(/\[[^\]]*\]/g) ?? []) {
      const filter = parseOverpassFilter(raw);
      if (!filter) {
        return null;
      }
      clause.push(filter);
    }
    unique.set(JSON.stringify(clause), clause);
  }
  return unique.size > 0 ? [...unique.values()] : null;
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
  const clauses = extractClauses(text);

  if (text.includes('natural"="water"') && (text.includes("waterway") || text.includes("place"))) {
    // Fail closed: landmass needs a bbox (never unbounded PostGIS).
    if (!bbox) return null;
    return { family: "landmass", meta: { bbox, tags, around } };
  }

  if (text.includes('natural"="coastline"')) {
    if (!bbox) return null;
    return { family: "coastline", meta: { bbox, tags, around } };
  }

  if (/route\s*~\s*"subway/i.test(text) || text.includes('route"~"subway')) {
    if (!around && !bbox) return null;
    return { family: "metro", meta: { around, bbox, tags } };
  }

  // Measuring linear borders use way["boundary"="administrative"]… + out geom.
  // Admin-division uses relation["boundary"="administrative"]… — require relation.
  const isAdminRelation =
    /relation\s*\[\s*"boundary"\s*=\s*"administrative"/i.test(text) && text.includes("admin_level");
  const isLinearWayGeom =
    /\bout\s+geom\b/i.test(text) &&
    /way\s*\[/.test(text) &&
    !text.includes('natural"="water"') &&
    !text.includes('natural"="coastline"');

  if (isLinearWayGeom && !isAdminRelation) {
    if (!bbox || !clauses) return null;
    return { family: "linear", meta: { bbox, clauses } };
  }

  if (isAdminRelation) {
    if (!bbox) return null;
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
    if (!clauses) return null;
    return { family: "around", meta: { around, clauses, bbox } };
  }

  if (isLinearWayGeom) {
    if (!bbox || !clauses) return null;
    return { family: "linear", meta: { bbox, clauses } };
  }

  if (/\bout\s+center\b/i.test(text)) {
    if ((!bbox && !around) || !clauses) return null;
    return { family: "places", meta: { bbox, clauses, around } };
  }

  return null;
}
