import { classifyOverpassQuery } from "./postpassClassify.mjs";
import { buildPostpassSql } from "./postpassSql.mjs";
import { fetchPostpassGeoJson } from "./postpassClient.mjs";
import { geoJsonToOverpassElements } from "./geoJsonToOverpassElements.mjs";

function logFailover(fields) {
  console.log(JSON.stringify({ type: "overpass_failover", ...fields }));
}

/**
 * Postpass fallback after Overpass pool exhaustion.
 * Returns normalized Overpass-shaped JSON text, or null when unclassified.
 *
 * @param {string} query
 * @returns {Promise<string | null>}
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
    logFailover({
      backend: "postpass",
      family: classification.family,
      endpoint: "postpass.geofabrik.de",
    });
    return JSON.stringify(normalized);
  } catch (error) {
    logFailover({
      backend: "postpass",
      family: classification.family,
      endpoint: "postpass.geofabrik.de",
      error:
        error instanceof Error
          ? error.message.slice(0, 120)
          : String(error).slice(0, 120),
    });
    throw error;
  }
}
