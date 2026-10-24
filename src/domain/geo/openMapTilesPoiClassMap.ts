export interface OpenMapTilesPoiProperties {
  class?: unknown;
  subclass?: unknown;
  name?: unknown;
  [key: string]: unknown;
}

const CLASS_TO_CATEGORY_IDS: Readonly<Record<string, readonly string[]>> = {
  museum: ["museum"],
  hospital: ["hospital"],
  clinic: [],
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
