import type { TransitRouteMode } from "../../domain/map/transit";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";

const MODE_COLORS: Record<TransitRouteMode, string> = {
  rail: MAP_ANNOTATION_COLORS.transit.rail,
  metro: MAP_ANNOTATION_COLORS.transit.metro,
  tram: MAP_ANNOTATION_COLORS.transit.tram,
  bus: MAP_ANNOTATION_COLORS.transit.bus,
  ferry: MAP_ANNOTATION_COLORS.transit.ferry,
  other: MAP_ANNOTATION_COLORS.transit.other,
};

function svgIcon(inner: string, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
    <circle cx="10" cy="10" r="9" fill="${MAP_ANNOTATION_COLORS.playAreaMask}" stroke="${color}" stroke-width="2"/>
    ${inner}
  </svg>`;
}

const MODE_SHAPES: Record<TransitRouteMode, string> = {
  bus: `<rect x="5.5" y="6" width="9" height="8" rx="1.5" fill="${MODE_COLORS.bus}"/>`,
  tram: `<path d="M6 14h8l-1.2-7H7.2L6 14zm1.2-8.5h5.6L13 5H7l.2.5z" fill="${MODE_COLORS.tram}"/>`,
  metro: `<rect x="6" y="6" width="8" height="8" fill="${MODE_COLORS.metro}"/><text x="10" y="12.5" text-anchor="middle" font-size="7" font-weight="700" fill="${MAP_ANNOTATION_COLORS.playAreaMask}">M</text>`,
  rail: `<path d="M5 13h10V8H5v5zm1.5-4.5h7v3h-7v-3z" fill="${MODE_COLORS.rail}"/>`,
  ferry: `<path d="M4 12h12l-1.5-4H5.5L4 12zm2.2-3.5h7.6l.8-2H5.4l.8 2z" fill="${MODE_COLORS.ferry}"/>`,
  other: `<circle cx="10" cy="10" r="3" fill="${MODE_COLORS.other}"/>`,
};

export function transitStopDivIcon(mode: TransitRouteMode): string {
  return svgIcon(MODE_SHAPES[mode], MODE_COLORS[mode]);
}
