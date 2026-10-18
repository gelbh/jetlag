import { useEffect } from "react";
import { useMapLibreMap } from "@/components/map/helpers/useMapLibreMap";
import { MOTION_MAP_CAMERA_SNAP_MS } from "@/domain/device/motion/motionTokens";
import type { TransitStation } from "@/domain/session/hiding/hidingZone";
import { useMotionProfile } from "@/hooks/motion/useMotionProfile";

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Pans (zoom unchanged) to the station picked for the hiding zone. Map drags interrupt it. */
export function HidingZoneStationFocus({ station }: { station: TransitStation | null }) {
  const map = useMapLibreMap();
  const { animate } = useMotionProfile();
  const lat = station?.lat;
  const lng = station?.lng;

  useEffect(() => {
    if (lat == null || lng == null) {
      return;
    }

    if (!animate) {
      map.jumpTo({ center: [lng, lat] });
      return;
    }

    map.easeTo({ center: [lng, lat], duration: MOTION_MAP_CAMERA_SNAP_MS, easing: easeInOutCubic });
  }, [animate, lat, lng, map]);

  return null;
}
