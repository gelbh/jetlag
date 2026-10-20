import { useEffect, useRef, useState } from "react";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { useMotionProfile } from "@/hooks/motion/useMotionProfile";
import { HIDING_ZONE_PIN_TRAVEL_MS, resolvePinTravelDisplay } from "./hidingZoneDraftPinTravel";

function centersEqual(a: LatLngTuple | null, b: LatLngTuple | null): boolean {
  if (a == null || b == null) {
    return a === b;
  }
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Display-only draft center while the tool-state center may already be at the station.
 * Shared by the pin marker and preview ring so they travel together.
 * Confirm must keep reading tool state, not this value.
 */
export function useHidingZoneDraftDisplayCenter(center: LatLngTuple | null): LatLngTuple | null {
  const { animate } = useMotionProfile();
  const [displayCenter, setDisplayCenter] = useState<LatLngTuple | null>(center);
  const committedRef = useRef<LatLngTuple | null>(center);
  const displayRef = useRef<LatLngTuple | null>(center);
  const travelRafRef = useRef<number | null>(null);

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

  return displayCenter;
}
