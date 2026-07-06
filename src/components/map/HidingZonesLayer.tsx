import { Circle, Marker, Polygon, Popup, Tooltip } from "react-leaflet";
import type { LatLngTuple } from "../../domain/geometry";
import type { HidingZoneRecord } from "../../domain/hidingZone";
import { shortPlayerLabel } from "../../domain/hidingZone";
import { MAP_ANNOTATION_COLORS } from "../../domain/mapAnnotationColors";

interface HidingZonesLayerProps {
  zones: readonly HidingZoneRecord[];
  myUid?: string | null;
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

export function HidingZonesLayer({ zones, myUid }: HidingZonesLayerProps) {
  return (
    <>
      {zones.map((zone) => {
        const ring = polygonPositions(zone.geometryJson);
        const center: LatLngTuple = [zone.center.lat, zone.center.lng];
        const isOwn = zone.hiderUid === myUid;
        const fillColor = isOwn
          ? MAP_ANNOTATION_COLORS.hidingZoneOwn
          : MAP_ANNOTATION_COLORS.hidingZone;
        const label = isOwn ? "Your zone" : `Hider ${shortPlayerLabel(zone.hiderUid)}`;

        return (
          <span key={zone.hiderUid}>
            {ring ? (
              <Polygon
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
            )}
            <Marker position={center}>
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <span className="text-xs font-medium">
                  {zone.stationName}
                  <br />
                  {label}
                </span>
              </Tooltip>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{zone.stationName}</p>
                  <p className="text-ink-muted">{label}</p>
                </div>
              </Popup>
            </Marker>
          </span>
        );
      })}
    </>
  );
}
