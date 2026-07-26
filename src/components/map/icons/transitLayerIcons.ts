import L from "leaflet";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import type { TransitRouteMode } from "../../../domain/map/transit";
import { transitStopDivIcon } from "../icons/transitStopIcons";

const TRANSIT_ROUTE_MODES: readonly TransitRouteMode[] = [
  "rail",
  "metro",
  "tram",
  "bus",
  "ferry",
  "other",
];

const STOP_ICONS: Record<TransitRouteMode, L.DivIcon> = Object.fromEntries(
  TRANSIT_ROUTE_MODES.map((mode) => [
    mode,
    L.divIcon({
      className: "",
      html: transitStopDivIcon(mode),
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    }),
  ]),
) as Record<TransitRouteMode, L.DivIcon>;

const vehicleIconCache = new Map<string, L.DivIcon>();

export function getTransitStopIcon(mode: TransitRouteMode): L.DivIcon {
  return STOP_ICONS[mode];
}

export function getTransitVehicleIcon(
  bearing: number | undefined,
  color: string,
): L.DivIcon {
  const rotation = Math.round((bearing ?? 0) / 15) * 15;
  const key = `${rotation}:${color}`;
  const cached = vehicleIconCache.get(key);
  if (cached) {
    return cached;
  }

  const icon = L.divIcon({
    className: "",
    html: `<div style="transform: rotate(${rotation}deg); width: 14px; height: 14px; border-radius: 9999px; background:${color}; border:2px solid ${MAP_ANNOTATION_COLORS.playAreaMask}; box-shadow:0 0 0 1px ${color};"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
  vehicleIconCache.set(key, icon);
  return icon;
}
