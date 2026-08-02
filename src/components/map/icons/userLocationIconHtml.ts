/** Shared SVG HTML for the user-location pin (Leaflet DivIcon + MapLibre). */

const USER_LOCATION_BLUE = "#4285F4";
const USER_LOCATION_CONE = "rgba(66, 133, 244, 0.3)";
const USER_LOCATION_ICON_SIZE = 48;

export function userLocationIconHtml(heading: number | null = null): string {
  const showHeading =
    typeof heading === "number" && Number.isFinite(heading) && heading >= 0;
  const rotation = showHeading ? heading : 0;
  const cone = showHeading
    ? `<g transform="rotate(${rotation} 24 24)"><path d="M24 24 L14.5 9.5 A11.5 11.5 0 0 1 33.5 9.5 Z" fill="${USER_LOCATION_CONE}"/></g>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${USER_LOCATION_ICON_SIZE}" height="${USER_LOCATION_ICON_SIZE}" viewBox="0 0 48 48" aria-hidden="true">${cone}<circle cx="24" cy="24" r="8" fill="${USER_LOCATION_BLUE}" stroke="#fff" stroke-width="3"/></svg>`;
}

export const USER_LOCATION_ICON_PIXEL_SIZE = USER_LOCATION_ICON_SIZE;
