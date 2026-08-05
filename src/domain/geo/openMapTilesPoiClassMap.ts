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

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
  if (subclass && subclass in SUBCLASS_TO_CATEGORY_IDS) {
    return [...SUBCLASS_TO_CATEGORY_IDS[subclass]];
  }

  const poiClass = asTrimmedString(props.class)?.toLowerCase() ?? null;
  if (poiClass && poiClass in CLASS_TO_CATEGORY_IDS) {
    return [...CLASS_TO_CATEGORY_IDS[poiClass]];
  }

  return [];
}

export function openMapTilesPoiDisplayName(
  props: OpenMapTilesPoiProperties | null | undefined,
): string | null {
  return asTrimmedString(props?.name ?? null);
}
