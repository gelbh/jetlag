import { Fragment } from "react";
import { CompensatedCircle } from "../helpers/CompensatedCircle";
import { CompensatedCircleMarker } from "../helpers/CompensatedCircleMarker";
import { CompensatedPolygon } from "../helpers/CompensatedPolygon";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import {
  isEndGameActive,
  type SessionRecord,
} from "../../../domain/map/annotations";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { resolveHiderTruthReference } from "../../../domain/questions/hiderTruth/resolveHiderTruthReference";
import type { HidingZoneRecord } from "../../../domain/session/hiding/hidingZone";
import { Tooltip } from "react-leaflet";

interface HidingZonesLayerProps {
  zones: readonly HidingZoneRecord[];
  myUid?: string | null;
  memberUids?: readonly string[];
  session?: Pick<
    SessionRecord,
    "endGameStartedAt" | "endGameTruthAnchors"
  > | null;
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

function answerReferenceTooltip(mode: "hidingZoneCenter" | "endGameFreeze"): string {
  return mode === "endGameFreeze"
    ? "Answer reference · End-game location"
    : "Answer reference · Hiding-zone center";
}

export function HidingZonesLayer({
  zones,
  myUid,
  memberUids,
  session,
}: HidingZonesLayerProps) {
  const memberSet = memberUids ? new Set(memberUids) : null;
  const visibleZones = memberSet
    ? zones.filter((zone) => memberSet.has(zone.hiderUid))
    : zones;
  const endGameActive = isEndGameActive(session);

  return (
    <>
      {visibleZones.map((zone) => {
        const ring = polygonPositions(zone.geometryJson);
        const center: LatLngTuple = [zone.center.lat, zone.center.lng];
        const isOwn = zone.hiderUid === myUid;
        const fillColor = isOwn
          ? MAP_ANNOTATION_COLORS.hidingZoneOwn
          : MAP_ANNOTATION_COLORS.hidingZone;
        const truthReference = resolveHiderTruthReference({
          hiderUid: zone.hiderUid,
          zoneCenter: center,
          session,
        });
        const referencePoint = truthReference.point;
        const showReferencePin =
          zone.status === "confirmed" &&
          referencePoint != null &&
          (truthReference.mode === "endGameFreeze" ||
            (truthReference.mode === "hidingZoneCenter" && !endGameActive));

        return (
          <Fragment key={zone.hiderUid}>
            {ring ? (
              <CompensatedPolygon
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
              <CompensatedCircle
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
            {showReferencePin ? (
              <CompensatedCircleMarker
                center={referencePoint}
                radius={7}
                pathOptions={{
                  color: MAP_ANNOTATION_COLORS.strokeLight,
                  weight: 2,
                  fillColor: MAP_ANNOTATION_COLORS.highlight,
                  fillOpacity: 1,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  {answerReferenceTooltip(
                    truthReference.mode === "endGameFreeze"
                      ? "endGameFreeze"
                      : "hidingZoneCenter",
                  )}
                </Tooltip>
              </CompensatedCircleMarker>
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}
