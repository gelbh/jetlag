import L from "leaflet";
import type { TransitRouteMode } from "../../../domain/map/transit";
import { transitStopDivIcon } from "./transitStopIcons";
import { transitVehicleIconHtml } from "./transitVehicleIconHtml";
export { transitVehicleIconHtml } from "./transitVehicleIconHtml";

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
    html: transitVehicleIconHtml(bearing, color),
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
  vehicleIconCache.set(key, icon);
  return icon;
}
