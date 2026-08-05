/**
 * Lossy OpenMapTiles `poi` layer class/subclass → Jetlag category ids.
 * Incomplete by design — missing classes yield [] and Overpass/bundle confirm fills gaps.
 */

export interface OpenMapTilesPoiProperties {
  class?: unknown;
  subclass?: unknown;
  name?: unknown;
  [key: string]: unknown;
}

/** Stable allowlist samples used by tools that share measuring / matching point ids. */
const CLASS_TO_CATEGORY_IDS: Readonly<Record<string, readonly string[]>> = {
  museum: ["museum"],
  hospital: ["hospital"],
  clinic: [], // clinics are not hospitals in Jetlag catalogs
  library: ["library"],
  cinema: ["movie_theater"],
  park: ["park"],
  zoo: ["zoo"],
  aquarium: ["aquarium"],
  theme_park: ["amusement_park"],
  attraction: ["amusement_park"],
  golf: ["golf_course"],
  aerodrome: ["commercial_airport"],
  airport: ["commercial_airport"],
  embassy: ["foreign_consulate"],
  // Transit stops / stations (OpenMapTiles class values)
  railway: ["rail_station"],
  bus: ["rail_station"],
  ferry_terminal: ["rail_station"],
};

const SUBCLASS_TO_CATEGORY_IDS: Readonly<Record<string, readonly string[]>> = {
  station: ["rail_station"],
  halt: ["rail_station"],
  subway: ["rail_station"],
  tram_stop: ["rail_station"],
  bus_stop: ["rail_station"],
};

/**
 * OpenMapTiles puts clinics/nursing homes under class=hospital with subclass.
 * Deny before the hospital class allowlist so provisional lists stay hospitals-only.
 */
const DENIED_SUBCLASSES = new Set(["clinic", "nursing_home"]);

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function categoryIdsForKey(
  map: Readonly<Record<string, readonly string[]>>,
  key: string,
): string[] | null {
  if (!Object.hasOwn(map, key)) {
    return null;
  }
  return [...map[key]];
}

/**
 * Map OpenMapTiles poi feature properties to zero or more Jetlag category ids.
 * Prefer subclass when it maps; otherwise class. Unknown → [].
 */
export function mapOpenMapTilesPoiToCategoryIds(
  props: OpenMapTilesPoiProperties | null | undefined,
): string[] {
  if (!props) {
    return [];
  }

  const subclass = asTrimmedString(props.subclass)?.toLowerCase() ?? null;
  if (subclass && DENIED_SUBCLASSES.has(subclass)) {
    return [];
  }
  if (subclass) {
    const fromSubclass = categoryIdsForKey(SUBCLASS_TO_CATEGORY_IDS, subclass);
    if (fromSubclass) {
      return fromSubclass;
    }
  }

  const poiClass = asTrimmedString(props.class)?.toLowerCase() ?? null;
  if (poiClass) {
    const fromClass = categoryIdsForKey(CLASS_TO_CATEGORY_IDS, poiClass);
    if (fromClass) {
      return fromClass;
    }
  }

  return [];
}

export function openMapTilesPoiDisplayName(
  props: OpenMapTilesPoiProperties | null | undefined,
): string | null {
  return asTrimmedString(props?.name ?? null);
}
