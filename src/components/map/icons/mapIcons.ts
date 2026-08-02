import L from "leaflet";
import type { MapStyle, StreetBasemap } from "../../../domain/map/mapBasemaps";
import {
  thermometerWalkEndLabelMarkup,
  thermometerWalkProgressMarkup,
} from "./thermometerWalkMarkup";
import {
  USER_LOCATION_ICON_PIXEL_SIZE,
  userLocationIconHtml,
} from "./userLocationIconHtml";

interface DotIconOptions {
  color: string;
  size: number;
  borderColor?: string;
  borderWidth?: number;
  shadow?: string;
  className?: string;
}

export function createDotIcon({
  color,
  size,
  borderColor = "#ffffff",
  borderWidth = 2,
  shadow,
  className = "",
}: DotIconOptions) {
  const radius = size / 2;

  return L.divIcon({
    className: `map-dot-icon ${className}`.trim(),
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:${borderWidth}px solid ${borderColor};box-shadow:${shadow ?? "0 0 0 2px rgba(15,23,42,0.45)"};"></span>`,
    iconSize: [size, size],
    iconAnchor: [radius, radius],
  });
}

export function createUserLocationIcon(heading: number | null = null) {
  const size = USER_LOCATION_ICON_PIXEL_SIZE;
  return L.divIcon({
    className: "user-location-icon",
    html: userLocationIconHtml(heading),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function createDraftCenterIcon(color: string) {
  return createDotIcon({
    color,
    size: 16,
    borderColor: "#ffffff",
    borderWidth: 2,
    shadow: "0 0 0 3px rgba(15,23,42,0.35)",
  });
}

export function createPinIcon(color: string) {
  return createDotIcon({
    color,
    size: 14,
    borderColor: "#ffffff",
    borderWidth: 2,
  });
}

export function createPoiIcon(color: string, highlighted: boolean) {
  return createDotIcon({
    color,
    size: highlighted ? 12 : 10,
    borderColor: highlighted ? "#fef08a" : "#ffffff",
    borderWidth: highlighted ? 3 : 2,
  });
}

export function createCountdownBadgeIcon(label: string, expired: boolean) {
  const background = expired ? "#C55B40" : "#1D2835";
  const text = expired ? "Expired" : label;

  return L.divIcon({
    className: "pending-question-countdown-badge",
    html: `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:${background};color:#ffffff;font-size:11px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;box-shadow:0 1px 4px rgba(15,23,42,0.35);">${text}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 24],
  });
}

function divIconFromMarkup(
  markup: { className: string; html: string },
  iconAnchor: [number, number],
) {
  return L.divIcon({
    className: markup.className,
    html: markup.html,
    iconSize: [0, 0],
    iconAnchor,
  });
}

export function createThermometerWalkProgressIcon(
  walkedLabel: string,
  targetLabel: string | null,
  mapStyle: MapStyle,
  streetBasemap: StreetBasemap = "light",
) {
  return divIconFromMarkup(
    thermometerWalkProgressMarkup(
      walkedLabel,
      targetLabel,
      mapStyle,
      streetBasemap,
    ),
    [0, 14],
  );
}

export function createThermometerWalkEndLabelIcon(
  label: string,
  mapStyle: MapStyle,
  streetBasemap: StreetBasemap = "light",
) {
  return divIconFromMarkup(
    thermometerWalkEndLabelMarkup(label, mapStyle, streetBasemap),
    [0, 28],
  );
}
