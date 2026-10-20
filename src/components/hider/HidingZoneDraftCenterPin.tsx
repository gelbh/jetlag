import { useEffect, useRef, useState } from "react";
import { MapLibreGeoJsonOverlay } from "@/components/map/helpers/MapLibreGeoJsonOverlay";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import { HIDING_ZONE_PIN_CHOSEN_MS, resolvePinCircleRadius } from "./hidingZoneDraftPinTravel";

export type HidingZoneDraftCenterPinProps = {
  /**
   * Display-only center from `useHidingZoneDraftDisplayCenter`.
   * Confirm must keep reading tool-state center, not this.
   */
  displayCenter: LatLngTuple | null;
  /** While true, pin idles/pulses at the current display (usually the tap). */
  snapping?: boolean;
  /** Station id after a successful snap; triggers a brief chosen radius bump. */
  chosenKey?: string | null;
};

/**
 * Draft-center marker while placing a hiding zone.
 * Position is display-only (may lag tool state during snap travel).
 */
export function HidingZoneDraftCenterPin({
  displayCenter,
  snapping = false,
  chosenKey = null,
}: HidingZoneDraftCenterPinProps) {
  const [chosenActive, setChosenActive] = useState(false);
  const previousChosenKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!chosenKey || chosenKey === previousChosenKeyRef.current) {
      if (!chosenKey) {
        previousChosenKeyRef.current = null;
        setChosenActive(false);
      }
      return;
    }

    previousChosenKeyRef.current = chosenKey;
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
