import type { Feature, Polygon } from "geojson";
import { cssPxDashToMapLibre } from "@/components/map/helpers/cssPxDashToMapLibre";
import { MapLibreGeoJsonOverlay } from "@/components/map/helpers/MapLibreGeoJsonOverlay";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import { hidingZonePreviewPositions } from "@/domain/session/hiding/hidingZone";
import { HidingZoneDraftCenterPin } from "./HidingZoneDraftCenterPin";
import { resolveHidingZoneDisplayPreviewCircle } from "./hidingZoneDraftPinTravel";
import { useHidingZoneDraftDisplayCenter } from "./useHidingZoneDraftDisplayCenter";

export type HidingZoneDraftPlacementOverlaysProps = {
  active: boolean;
  manualMode: boolean;
  manualCenter: LatLngTuple | null;
  selectedStationLat: number | null;
  selectedStationLng: number | null;
  radiusMeters: number;
  toolPreviewCircle: Feature<Polygon> | null;
  snapping: boolean;
  chosenKey: string | null;
};

/**
 * Display-only pin + preview ring for zone placement.
 * Keeps travel-hook state out of HiderMapScreen so React Compiler stays happy.
 */
export function HidingZoneDraftPlacementOverlays({
  active,
  manualMode,
  manualCenter,
  selectedStationLat,
  selectedStationLng,
  radiusMeters,
  toolPreviewCircle,
  snapping,
  chosenKey,
}: HidingZoneDraftPlacementOverlaysProps) {
  const draftCenterPin: LatLngTuple | null = !active
    ? null
    : manualMode
      ? manualCenter
      : selectedStationLat != null && selectedStationLng != null
        ? [selectedStationLat, selectedStationLng]
        : null;

  const draftDisplayCenter = useHidingZoneDraftDisplayCenter(draftCenterPin);
  const previewRing = hidingZonePreviewPositions(
    resolveHidingZoneDisplayPreviewCircle({
      displayCenter: draftDisplayCenter,
      radiusMeters,
      toolPreviewCircle,
    }),
  );

  return (
    <>
      {previewRing.length > 0 ? (
        <MapLibreGeoJsonOverlay
          id="hider-zone-preview"
          data={{
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  ...previewRing.map(([lat, lng]) => [lng, lat] as [number, number]),
                  [previewRing[0]![1], previewRing[0]![0]],
                ],
              ],
            },
          }}
          fill={{
            fillColor: MAP_ANNOTATION_COLORS.hidingZoneOwn,
            fillOpacity: 0.12,
          }}
          line={{
            color: MAP_ANNOTATION_COLORS.hidingZoneOwn,
            width: 2,
            dashArray: cssPxDashToMapLibre("6 6", 2),
          }}
        />
      ) : null}
      <HidingZoneDraftCenterPin
        displayCenter={draftDisplayCenter}
        snapping={snapping}
        chosenKey={chosenKey}
      />
    </>
  );
}
