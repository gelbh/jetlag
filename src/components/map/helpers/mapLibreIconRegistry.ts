import { useEffect } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import type { TransitRouteMode } from "@/domain/map/transit";
import { transitStopDivIcon } from "../icons/transitStopIcons";
import { userLocationIconHtml } from "../icons/userLocationIconHtml";
import { useMapLibreMap } from "./useMapLibreMap";

/** North-up cone sprite — rotate via MapLibre `icon-rotate`. */
export const JL_ICON_USER_LOCATION = "jl-icon-user-location";
/** Dot only (no heading). */
export const JL_ICON_USER_LOCATION_PLAIN = "jl-icon-user-location-plain";
/** Last-resort circle if SVG decode fails. */
export const JL_ICON_USER_LOCATION_FALLBACK = "jl-icon-user-location-fallback";

const TRANSIT_ICON_IDS: Record<TransitRouteMode, string> = {
  rail: "jl-icon-transit-rail",
  metro: "jl-icon-transit-metro",
  tram: "jl-icon-transit-tram",
  bus: "jl-icon-transit-bus",
  ferry: "jl-icon-transit-ferry",
  other: "jl-icon-transit-other",
};

const TRANSIT_MODES: TransitRouteMode[] = [
  "rail",
  "metro",
  "tram",
  "bus",
  "ferry",
  "other",
];

/** Serialize overlapping register() across mount + style.load per map. */
const registerInFlight = new WeakMap<MapLibreMap, Promise<void>>();

export function transitModeIconId(mode: TransitRouteMode): string {
  return TRANSIT_ICON_IDS[mode];
}

export function transitVehicleIconId(mode: TransitRouteMode): string {
  return `jl-icon-transit-vehicle-${mode}`;
}

/**
 * Guard before hasImage/addImage — MapLibre throws when `style` is undefined
 * (teardown / mid-setStyle) or the map was removed.
 */
function canMutateMapImages(map: MapLibreMap): boolean {
  if (map._removed) {
    return false;
  }
  try {
    // `style` is public on MapLibre Map; undefined during style swap/teardown.
    if (!map.style) {
      return false;
    }
    return map.isStyleLoaded() === true;
  } catch {
    return false;
  }
}

/** hasImage → style.getImage; style can go null between canMutate and hasImage (JETLAG-3H). */
function safeHasImage(map: MapLibreMap, imageId: string): boolean {
  if (!canMutateMapImages(map)) {
    return false;
  }
  try {
    return map.hasImage(imageId);
  } catch {
    return false;
  }
}

/**
 * Add only when style images API is still live. Do not call addImage after a
 * swallowed hasImage failure — that race is what threw in production.
 */
function safeAddImage(
  map: MapLibreMap,
  imageId: string,
  image: HTMLImageElement,
): boolean {
  if (!canMutateMapImages(map)) {
    return false;
  }
  try {
    if (map.hasImage(imageId)) {
      return true;
    }
    map.addImage(imageId, image, { pixelRatio: 2 });
    return map.hasImage(imageId);
  } catch {
    return false;
  }
}

async function loadSvgImage(
  map: MapLibreMap,
  imageId: string,
  svgMarkup: string,
  width: number,
  height: number,
): Promise<boolean> {
  if (safeHasImage(map, imageId)) {
    return true;
  }

  try {
    const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image(width, height);
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to decode ${imageId}`));
        img.src = url;
      });
      // Style may tear down during decode — never call hasImage/addImage then.
      return safeAddImage(map, imageId, image);
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[map] marker image failed: ${imageId}`, error);
    }
    return false;
  }
}

function vehicleSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="14" height="14"><circle cx="7" cy="7" r="5" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`;
}

function userLocationFallbackSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="8" fill="#4285F4" stroke="#fff" stroke-width="3"/></svg>`;
}

async function registerMapLibreMarkerImagesOnce(
  map: MapLibreMap,
): Promise<void> {
  if (!canMutateMapImages(map)) {
    return;
  }

  const userLoads = await Promise.all([
    loadSvgImage(
      map,
      JL_ICON_USER_LOCATION,
      // Cone baked north-up so `icon-rotate` can apply live heading.
      userLocationIconHtml(0),
      48,
      48,
    ),
    loadSvgImage(
      map,
      JL_ICON_USER_LOCATION_PLAIN,
      userLocationIconHtml(null),
      48,
      48,
    ),
  ]);
  if (userLoads.some((ok) => !ok)) {
    await loadSvgImage(
      map,
      JL_ICON_USER_LOCATION_FALLBACK,
      userLocationFallbackSvg(),
      24,
      24,
    );
  }

  await Promise.all(
    TRANSIT_MODES.flatMap((mode) => [
      loadSvgImage(
        map,
        TRANSIT_ICON_IDS[mode],
        transitStopDivIcon(mode),
        20,
        20,
      ),
      loadSvgImage(
        map,
        transitVehicleIconId(mode),
        vehicleSvg(MAP_ANNOTATION_COLORS.transit[mode]),
        14,
        14,
      ),
    ]),
  );
}

/** Load shared marker images into the MapLibre map (idempotent per style). */
export async function registerMapLibreMarkerImages(
  map: MapLibreMap,
): Promise<void> {
  const previous = registerInFlight.get(map) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => registerMapLibreMarkerImagesOnce(map));
  registerInFlight.set(
    map,
    next.finally(() => {
      if (registerInFlight.get(map) === next) {
        registerInFlight.delete(map);
      }
    }),
  );
  await next;
}

/**
 * Keep marker sprites registered across `setStyle` (basemap toggles clear images).
 */
export function useMapLibreMarkerImages(): void {
  const mapRef = useMapLibreMap();

  useEffect(() => {
    const map = mapRef.getMap();
    let cancelled = false;

    const register = () => {
      if (cancelled) {
        return;
      }
      void registerMapLibreMarkerImages(map);
    };

    register();
    map.on("style.load", register);

    return () => {
      cancelled = true;
      map.off("style.load", register);
    };
  }, [mapRef]);
}
