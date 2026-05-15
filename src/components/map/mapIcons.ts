import L from "leaflet";

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

const USER_LOCATION_BLUE = "#4285F4";
const USER_LOCATION_CONE = "rgba(66, 133, 244, 0.3)";
const USER_LOCATION_ICON_SIZE = 48;

export function createUserLocationIcon(heading: number | null = null) {
  const showHeading =
    typeof heading === "number" && Number.isFinite(heading) && heading >= 0;
  const rotation = showHeading ? heading : 0;
  const cone = showHeading
    ? `<g transform="rotate(${rotation} 24 24)"><path d="M24 24 L14.5 9.5 A11.5 11.5 0 0 1 33.5 9.5 Z" fill="${USER_LOCATION_CONE}"/></g>`
    : "";

  return L.divIcon({
    className: "user-location-icon",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${USER_LOCATION_ICON_SIZE}" height="${USER_LOCATION_ICON_SIZE}" viewBox="0 0 48 48" aria-hidden="true">${cone}<circle cx="24" cy="24" r="8" fill="${USER_LOCATION_BLUE}" stroke="#ffffff" stroke-width="3"/></svg>`,
    iconSize: [USER_LOCATION_ICON_SIZE, USER_LOCATION_ICON_SIZE],
    iconAnchor: [USER_LOCATION_ICON_SIZE / 2, USER_LOCATION_ICON_SIZE / 2],
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
