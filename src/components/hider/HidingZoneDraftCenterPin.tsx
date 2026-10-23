import { useEffect, useState } from "react";
import { MapLibreGeoJsonOverlay } from "@/components/map/helpers/MapLibreGeoJsonOverlay";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import { HIDING_ZONE_PIN_CHOSEN_MS, resolvePinCircleRadius } from "./hidingZoneDraftPinTravel";

export type HidingZoneDraftCenterPinProps = {
  displayCenter: LatLngTuple | null;
  snapping?: boolean;
  chosenKey?: string | null;
};

export function HidingZoneDraftCenterPin({
  displayCenter,
  snapping = false,
  chosenKey = null,
}: HidingZoneDraftCenterPinProps) {
  const [chosenActive, setChosenActive] = useState(false);

  useEffect(() => {
    if (!chosenKey) {
      setChosenActive(false);
      return;
    }

    setChosenActive(true);
    const timeoutId = window.setTimeout(() => {
      setChosenActive(false);
    }, HIDING_ZONE_PIN_CHOSEN_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [chosenKey]);

  if (!displayCenter) {
    return null;
  }

  return (
    <MapLibreGeoJsonOverlay
      id="hiding-zone-draft-center-pin"
      data={{
        type: "Point",
        coordinates: [displayCenter[1], displayCenter[0]],
      }}
      circle={{
        radius: resolvePinCircleRadius({ snapping, chosenActive }),
        color: MAP_ANNOTATION_COLORS.pin,
        strokeColor: "#ffffff",
        strokeWidth: 2,
      }}
    />
  );
}
