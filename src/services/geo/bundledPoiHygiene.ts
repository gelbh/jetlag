// Keep in sync with .cursor/scripts/bundled-poi-hygiene.mjs (build-time mirror).
import { haversineMeters } from "../../domain/geometry/distance";

export interface BundledPoiPlaceLike {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

const DEDUPE_PROXIMITY_METERS = 150;

const TYPO_FIXES: readonly [RegExp, string][] = [[/\bsqaure\b/g, "square"]];

/** Category noise suffixes stripped for park dedup only. */
const PARK_NOISE_SUFFIX = /\s+(park|playground|square|plaza|playfield)$/;

/** Street-like names that leak in from GIS parcel data. */
const STREET_SUFFIX =
  /\b(st|rd|dr|ave|blvd|boulevard|road|street|avenue|drive)\.?$/;

/** Non-park facilities the official park rules exclude. */
const PARK_EXCLUSIONS: readonly RegExp[] = [
  /school/,
  /\b(stadium|arena|ballfield)\b/,
  /hadlock/,
  /snow storage/,
  /open ?space/,
  /\bpaths\b/,
];

function collapseName(name: string): string {
  let collapsed = name.trim().toLowerCase().replace(/\s+/g, " ");
  for (const [pattern, replacement] of TYPO_FIXES) {
    collapsed = collapsed.replace(pattern, replacement);
  }
  return collapsed;
}

export function normalizeBundledPoiName(name: string, category: string): string {
  const collapsed = collapseName(name);
  if (category === "park") {
    return collapsed.replace(PARK_NOISE_SUFFIX, "");
  }
  return collapsed;
}

/** Category-specific exclusions; only park has known junk sources today. */
export function isEligibleBundledPoi(
  place: BundledPoiPlaceLike,
  category: string,
): boolean {
  if (category !== "park") {
    return true;
  }

  const name = collapseName(place.name);
  if (!name || STREET_SUFFIX.test(name)) {
    return false;
  }
  return !PARK_EXCLUSIONS.some((pattern) => pattern.test(name));
}

/** Wikidata entries win over regional supplements (pme:openspace:*, etc.). */
function preferenceRank(id: string): number {
  return /^Q\d+$/.test(id) ? 0 : 1;
}

function withinProximity(a: BundledPoiPlaceLike, b: BundledPoiPlaceLike): boolean {
  return (
    haversineMeters([a.lat, a.lng], [b.lat, b.lng]) <= DEDUPE_PROXIMITY_METERS
  );
}

function tokensSubset(candidate: string, existing: string): boolean {
  const candidateTokens = candidate.split(" ");
  const existingTokens = new Set(existing.split(" "));
  return (
    candidateTokens.every((token) => existingTokens.has(token)) ||
    existing.split(" ").every((token) => new Set(candidateTokens).has(token))
  );
}

/**
 * Two-pass dedup modeled on dedupeTransitStations:
 * 1. Exact normalized name: keep the preferred entry. rail_station keeps
 *    distant same-name stations (Jamaica exists at several locations);
 *    other categories keep one entry per name.
 * 2. Fuzzy (non-rail): drop entries whose name tokens are a subset of a kept
 *    entry (or vice versa) within 150 m, e.g. GIS "Payson" next to Wikidata
 *    "Edward Payson Park".
 */
export function dedupeBundledPoiPlaces<T extends BundledPoiPlaceLike>(
  places: readonly T[],
  category: string,
): T[] {
  const buckets = new Map<string, T[]>();
  for (const place of places) {
    const key = normalizeBundledPoiName(place.name, category);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(place);
    } else {
      buckets.set(key, [place]);
    }
  }

  const exactDeduped: T[] = [];
  for (const bucket of buckets.values()) {
    const sorted = [...bucket].sort(
      (a, b) => preferenceRank(a.id) - preferenceRank(b.id),
    );

    if (category === "rail_station") {
      const kept: T[] = [];
      for (const place of sorted) {
        if (!kept.some((existing) => withinProximity(existing, place))) {
          kept.push(place);
        }
      }
      exactDeduped.push(...kept);
      continue;
    }

    exactDeduped.push(sorted[0]!);
  }

  if (category === "rail_station") {
    return exactDeduped;
  }

  const sortedByPreference = [...exactDeduped].sort(
    (a, b) => preferenceRank(a.id) - preferenceRank(b.id),
  );
  const fuzzyKept: T[] = [];
  for (const place of sortedByPreference) {
    const key = normalizeBundledPoiName(place.name, category);
    const duplicate = fuzzyKept.some(
      (existing) =>
        withinProximity(existing, place) &&
        tokensSubset(key, normalizeBundledPoiName(existing.name, category)),
    );
    if (!duplicate) {
      fuzzyKept.push(place);
    }
  }

  // Restore input order for stable bundle output.
  const keptIds = new Set(fuzzyKept.map((place) => place.id));
  return exactDeduped.filter((place) => keptIds.has(place.id));
}

export function sanitizeBundledPoiPlaces<T extends BundledPoiPlaceLike>(
  places: readonly T[],
  category: string,
): T[] {
  const eligible = places.filter((place) =>
    isEligibleBundledPoi(place, category),
  );
  return dedupeBundledPoiPlaces(eligible, category);
}
