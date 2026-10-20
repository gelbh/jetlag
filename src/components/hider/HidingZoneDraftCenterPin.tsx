import { useEffect, useRef, useState } from "react";
import { MapLibreGeoJsonOverlay } from "@/components/map/helpers/MapLibreGeoJsonOverlay";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import { useMotionProfile } from "@/hooks/motion/useMotionProfile";
import {
  HIDING_ZONE_PIN_CHOSEN_MS,
  HIDING_ZONE_PIN_TRAVEL_MS,
  resolvePinCircleRadius,
  resolvePinTravelDisplay,
} from "./hidingZoneDraftPinTravel";

export type HidingZoneDraftCenterPinProps = {
  /** Tool-state draft center (Confirm source). Display may lag while traveling. */
  center: LatLngTuple | null;
  /** While true, pin idles/pulses at the current display (usually the tap). */
  snapping?: boolean;
  /** Station id after a successful snap; triggers a brief chosen radius bump. */
  chosenKey?: string | null;
};

function centersEqual(a: LatLngTuple | null, b: LatLngTuple | null): boolean {
  if (a == null || b == null) {
    return a === b;
  }
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Draft-center marker while placing a hiding zone.
 * Commits center immediately in tool state; visually tweens on snap when motion allows.
 */
export function HidingZoneDraftCenterPin({
  center,
  snapping = false,
  chosenKey = null,
}: HidingZoneDraftCenterPinProps) {
  const { animate } = useMotionProfile();
  const [displayCenter, setDisplayCenter] = useState<LatLngTuple | null>(center);
  const [chosenActive, setChosenActive] = useState(false);
  const committedRef = useRef<LatLngTuple | null>(center);
  const displayRef = useRef<LatLngTuple | null>(center);
  const travelRafRef = useRef<number | null>(null);
  const previousChosenKeyRef = useRef<string | null>(null);

  useEffect(() => {
    displayRef.current = displayCenter;
  }, [displayCenter]);

  useEffect(() => {
    if (travelRafRef.current != null) {
      cancelAnimationFrame(travelRafRef.current);
      travelRafRef.current = null;
    }

    if (!center) {
      committedRef.current = null;
      displayRef.current = null;
      setDisplayCenter(null);
      return;
    }

    const previous = displayRef.current ?? committedRef.current;
    committedRef.current = center;

    if (!previous || centersEqual(previous, center) || !animate) {
      displayRef.current = center;
      setDisplayCenter(center);
      return;
    }

    const from = previous;
    const to = center;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const frame = resolvePinTravelDisplay({
        from,
        to,
        elapsedMs: now - startedAt,
        durationMs: HIDING_ZONE_PIN_TRAVEL_MS,
        animate: true,
      });
      displayRef.current = frame.displayCenter;
      setDisplayCenter(frame.displayCenter);
      if (frame.traveling) {
        travelRafRef.current = requestAnimationFrame(tick);
        return;
      }
      travelRafRef.current = null;
    };

    travelRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (travelRafRef.current != null) {
        cancelAnimationFrame(travelRafRef.current);
        travelRafRef.current = null;
      }
    };
  }, [animate, center]);

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
