import { FetchTimeoutError, fetchWithTimeout } from "../lib/fetchWithTimeout.mjs";
import { OVERPASS_USER_AGENT } from "./overpassEndpoints.mjs";

export const POSTPASS_ENDPOINT =
  "https://postpass.geofabrik.de/api/0.2/interpreter";

export const POSTPASS_FETCH_TIMEOUT_MS = 25_000;

/**
 * @param {string} sql
 * @returns {Promise<object>} GeoJSON FeatureCollection
 */
export async function fetchPostpassGeoJson(sql) {
  // Postpass convention: do not append a trailing semicolon.
  const data = String(sql).replace(/;\s*$/, "");
  let response;
  try {
    response = await fetchWithTimeout(
      POSTPASS_ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": OVERPASS_USER_AGENT,
          Accept: "application/geo+json, application/json",
        },
        body: `data=${encodeURIComponent(data)}`,
      },
      POSTPASS_FETCH_TIMEOUT_MS,
    );
  } catch (error) {
    if (error instanceof FetchTimeoutError) {
      throw new Error("Postpass timed out.");
    }
    throw error;
  }

  if (!response.ok) {
    try {
      void response.body?.cancel()?.catch?.(() => {});
    } catch {
      // best-effort
    }
    throw new Error(`Postpass query failed (${response.status}).`);
  }

  const body = await response.json();
  if (
    body == null ||
    typeof body !== "object" ||
    (body.type !== "FeatureCollection" && !Array.isArray(body.features))
  ) {
    throw new Error("Postpass returned unexpected payload.");
  }
  return body;
}
