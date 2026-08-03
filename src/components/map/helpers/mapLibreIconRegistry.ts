import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { TransitRouteMode } from "../../../domain/map/transit";
import { transitStopDivIcon } from "../icons/transitStopIcons";
import { userLocationIconHtml } from "../icons/userLocationIconHtml";
import { useMapLibreMap } from "./useMapLibreMap";

export const JL_ICON_USER_LOCATION = "jl-icon-user-location";
export const JL_ICON_USER_LOCATION_FALLBACK = "jl-icon-user-location-fallback";

const TRANSIT_ICON_IDS: Record<TransitRouteMode, string> = {
  rail: "jl-icon-transit-rail",
  metro: "jl-icon-transit-metro",
  tram: "jl-icon-transit-tram",
  bus: "jl-icon-transit-bus",
  ferry: "jl-icon-transit-ferry",
  other: "jl-icon-transit-other",
};

export function transitModeIconId(mode: TransitRouteMode): string {
  return TRANSIT_ICON_IDS[mode];
}

export function transitVehicleIconId(mode: TransitRouteMode): string {
  return `jl-icon-transit-vehicle-${mode}`;
}

async function loadSvgImage(
  map: MapLibreMap,
  imageId: string,
  svgMarkup: string,
  width: number,
  height: number,
): Promise<boolean> {
  if (map.hasImage(imageId)) {
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
      map.addImage(imageId, image, { pixelRatio: 2 });
      return true;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return false;
  }
}

function vehicleSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="14" height="14"><circle cx="7" cy="7" r="5" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`;
}

function userLocationFallbackSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="8" fill="#4285F4" stroke="#fff" stroke-width="3"/></svg>`;
}

/** Load shared marker images into the MapLibre map (idempotent). */
export async function registerMapLibreMarkerImages(
  map: MapLibreMap,
): Promise<void> {
  const userOk = await loadSvgImage(
    map,
    JL_ICON_USER_LOCATION,
    userLocationIconHtml(null),
    48,
    48,
  );
  if (!userOk) {
    await loadSvgImage(
      map,
      JL_ICON_USER_LOCATION_FALLBACK,
      userLocationFallbackSvg(),
      24,
      24,
    );
  }

  const modes: TransitRouteMode[] = [
    "rail",
    "metro",
    "tram",
    "bus",
    "ferry",
    "other",
  ];
  for (const mode of modes) {
    await loadSvgImage(
      map,
      TRANSIT_ICON_IDS[mode],
      transitStopDivIcon(mode),
      20,
      20,
    );
    await loadSvgImage(
      map,
      transitVehicleIconId(mode),
      vehicleSvg("#888"),
      14,
      14,
    );
  }
}

export function useMapLibreMarkerImages(): void {
  const mapRef = useMapLibreMap();
  const loadedRef = useRef(false);

  useEffect(() => {
    const map = mapRef.getMap();
    if (loadedRef.current) {
      return;
    }

    let cancelled = false;
    void registerMapLibreMarkerImages(map).then(() => {
      if (!cancelled) {
        loadedRef.current = true;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mapRef]);
}

/** Hook that loads marker images when used outside a Map child (no throw). */
export function useOptionalMapLibreMarkerImages(enabled: boolean): void {
  const mapRef = useOptionalMapLibreMap();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !mapRef) {
      return;
    }
    const map = mapRef.getMap();
    if (loadedRef.current) {
      return;
    }

    let cancelled = false;
    void registerMapLibreMarkerImages(map).then(() => {
      if (!cancelled) {
        loadedRef.current = true;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, mapRef]);
}

function useOptionalMapLibreMap() {
  try {
    return useMapLibreMap();
  } catch {
    return null;
  }
}
