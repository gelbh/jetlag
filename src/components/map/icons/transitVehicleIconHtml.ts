import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";

/** Shared HTML for transit vehicle pins (Leaflet DivIcon + MapLibre). */
export function transitVehicleIconHtml(
  bearing: number | undefined,
  color: string,
): string {
  const rotation = Math.round((bearing ?? 0) / 15) * 15;
  return `<div style="transform: rotate(${rotation}deg); width: 14px; height: 14px; border-radius: 50%; background:${color}; border:2px solid ${MAP_ANNOTATION_COLORS.playAreaMask}; box-shadow:0 0 0 1px ${color};"></div>`;
}
