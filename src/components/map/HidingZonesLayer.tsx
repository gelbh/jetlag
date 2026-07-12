import { Circle, Polygon } from "react-leaflet";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import type { HidingZoneRecord } from "../../domain/session/hidingZone";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";

interface HidingZonesLayerProps {
  zones: readonly HidingZoneRecord[];
  myUid?: string | null;
  memberUids?: readonly string[];
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

        return ring ? (
          <Polygon
            key={zone.hiderUid}
            positions={ring}
            pathOptions={{
              color: fillColor,
              weight: isOwn ? 3 : 2,
              fillColor,
              fillOpacity: zone.moveInProgress ? 0.08 : 0.18,
              dashArray: zone.moveInProgress ? "8 8" : undefined,
            }}
          />
        ) : (
          <Circle
            key={zone.hiderUid}
            center={center}
            radius={zone.radiusMeters}
            pathOptions={{
              color: fillColor,
              weight: isOwn ? 3 : 2,
              fillColor,
              fillOpacity: zone.moveInProgress ? 0.08 : 0.18,
              dashArray: zone.moveInProgress ? "8 8" : undefined,
            }}
          />
        );
      })}
    </>
  );
}
