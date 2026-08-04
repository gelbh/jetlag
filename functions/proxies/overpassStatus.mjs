import { fetchWithTimeout } from "../lib/fetchWithTimeout.mjs";
import { OVERPASS_USER_AGENT } from "./overpassEndpoints.mjs";

export const OVERPASS_STATUS_TIMEOUT_MS = 1000;

/**
 * @param {string} statusText
 * @returns {number | null} seconds until a free slot, or null if unparseable
 */
export function parseSlotAvailableAfter(statusText) {
  const match = String(statusText).match(/Slot available after:\s*(-?\d+)/i);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/**
 * Map `/api/interpreter` → `/api/status` for the same Overpass peer.
 *
 * @param {string} interpreterUrl
 * @returns {string | null}
 */
export function overpassStatusUrl(interpreterUrl) {
  try {
    const url = new URL(interpreterUrl);
    if (!url.pathname.endsWith("/interpreter")) {
      return null;
    }
    url.pathname = url.pathname.replace(/\/interpreter$/, "/status");
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Best-effort reorder: peers with `Slot available after: 0` first.
 * On any probe failure, keep original relative order for that peer.
 *
 * @param {string[]} endpoints
 * @returns {Promise<string[]>}
 */
export async function orderOverpassEndpointsByStatus(endpoints) {
  if (endpoints.length <= 1) {
    return [...endpoints];
  }

  const scored = await Promise.all(
    endpoints.map(async (endpoint, index) => {
      const statusUrl = overpassStatusUrl(endpoint);
      if (!statusUrl) {
        return { endpoint, index, slotAfter: Number.POSITIVE_INFINITY };
      }
      try {
        const response = await fetchWithTimeout(
          statusUrl,
          {
            method: "GET",
            headers: { "User-Agent": OVERPASS_USER_AGENT },
          },
          OVERPASS_STATUS_TIMEOUT_MS,
        );
        if (!response.ok) {
          return { endpoint, index, slotAfter: Number.POSITIVE_INFINITY };
        }
        const text = await response.text();
        const slotAfter = parseSlotAvailableAfter(text);
        return {
          endpoint,
          index,
          slotAfter:
            slotAfter == null ? Number.POSITIVE_INFINITY : Math.max(0, slotAfter),
        };
      } catch {
        return { endpoint, index, slotAfter: Number.POSITIVE_INFINITY };
      }
    }),
  );

  scored.sort((a, b) => {
    if (a.slotAfter !== b.slotAfter) {
      return a.slotAfter - b.slotAfter;
    }
    return a.index - b.index;
  });

  return scored.map((entry) => entry.endpoint);
}
