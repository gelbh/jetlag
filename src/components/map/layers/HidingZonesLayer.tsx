import turfCircle from "@turf/circle";
import type { Feature, Polygon as GeoPolygon } from "geojson";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import type { HidingZoneRecord } from "../../../domain/session/hiding/hidingZone";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { cssPxDashToMapLibre } from "../helpers/cssPxDashToMapLibre";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";

interface HidingZonesLayerProps {
  zones: readonly HidingZoneRecord[];
  myUid?: string | null;
  memberUids?: readonly string[];
}

function polygonFeature(ring: LatLngTuple[]): Feature<GeoPolygon> {
  const coordinates = [ring.map(([lat, lng]) => [lng, lat] as [number, number])];
  coordinates[0]!.push(coordinates[0]![0]!);
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates },
  };
}

function polygonPositions(geometryJson: string): LatLngTuple[] | null {
  try {
    const geometry = JSON.parse(geometryJson) as {
      type?: string;
      coordinates?: number[][][];
    };

    if (geometry.type !== "Polygon" || !geometry.coordinates?.[0]) {
      return null;
    }

    return geometry.coordinates[0].map(
      ([lng, lat]) => [lat, lng] as LatLngTuple,
    );
  } catch {
    return null;
  }
}

export function HidingZonesLayer({
  zones,
  myUid,
  memberUids,
}: HidingZonesLayerProps) {
  const memberSet = memberUids ? new Set(memberUids) : null;
  const visibleZones = memberSet
    ? zones.filter((zone) => memberSet.has(zone.hiderUid))
    : zones;

  return (
    <>
      {visibleZones.map((zone) => {
        const ring = polygonPositions(zone.geometryJson);
        const center: LatLngTuple = [zone.center.lat, zone.center.lng];
        const isOwn = zone.hiderUid === myUid;
        const fillColor = isOwn
          ? MAP_ANNOTATION_COLORS.hidingZoneOwn
          : MAP_ANNOTATION_COLORS.hidingZone;
        const weight = isOwn ? 3 : 2;
        const fillOpacity = zone.moveInProgress ? 0.08 : 0.18;
        const dashArray = zone.moveInProgress ? "8 8" : undefined;

        const data = ring
          ? polygonFeature(ring)
          : turfCircle([center[1], center[0]], zone.radiusMeters / 1000, {
              steps: 64,
              units: "kilometers",
            });

        return (
          <MapLibreGeoJsonOverlay
            key={zone.hiderUid}
            id={`hiding-zone-${zone.hiderUid}`}
            data={data}
            fill={{ fillColor, fillOpacity }}
            line={{
              color: fillColor,
              width: weight,
              dashArray: cssPxDashToMapLibre(dashArray, weight),
            }}
          />
        );
      })}
    </>
  );
}
