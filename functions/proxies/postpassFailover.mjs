import { geoJsonToOverpassElements } from "./geoJsonToOverpassElements.mjs";
import { classifyOverpassQuery } from "./postpassClassify.mjs";
import { fetchPostpassGeoJson } from "./postpassClient.mjs";
import { buildPostpassSql } from "./postpassSql.mjs";

function logFailover(fields) {
  console.log(JSON.stringify({ type: "overpass_failover", ...fields }));
}

/** Families whose Postpass SQL is a superset of the Overpass query, so empty means no data. */
export const POSTPASS_TRUSTED_EMPTY_FAMILIES = new Set(["admin"]);

/**
 * Postpass fallback after Overpass pool exhaustion.
 * Returns normalized Overpass-shaped JSON text, or null when unclassified or untrusted empty.
 *
 * @param {string} query
 * @returns {Promise<{ text: string, empty: boolean } | null>}
 */
export async function tryPostpassForOverpassQuery(query) {
  const classification = classifyOverpassQuery(query);
  if (!classification) {
    logFailover({
      backend: "postpass",
      error: "unclassified",
    });
    return null;
  }

  try {
    const sql = buildPostpassSql(classification);
    const fc = await fetchPostpassGeoJson(sql);
    const normalized = geoJsonToOverpassElements(fc, classification.family);
    if (!Array.isArray(normalized.elements) || normalized.elements.length === 0) {
      const served = POSTPASS_TRUSTED_EMPTY_FAMILIES.has(classification.family);
      logFailover({
        backend: "postpass",
        family: classification.family,
        endpoint: "postpass.geofabrik.de",
        error: "empty",
        served,
        // Game-area bbox only; never log `around` (a player position).
        bbox: classification.meta.bbox ?? null,
        adminLevel: classification.meta.adminLevel ?? null,
      });
      return served ? { text: JSON.stringify({ elements: [] }), empty: true } : null;
    }
    logFailover({
      backend: "postpass",
      family: classification.family,
      endpoint: "postpass.geofabrik.de",
    });
    return { text: JSON.stringify(normalized), empty: false };
  } catch (error) {
    logFailover({
      backend: "postpass",
      family: classification.family,
      endpoint: "postpass.geofabrik.de",
      error: error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120),
    });
    throw error;
  }
}
