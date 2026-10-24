import { useEffect } from "react";
import { useMapLibreMap } from "@/components/map/helpers/useMapLibreMap";
import { MOTION_MAP_CAMERA_SNAP_MS } from "@/domain/device/motion/motionTokens";
import type { TransitStation } from "@/domain/session/hiding/hidingZone";
import { useMotionProfile } from "@/hooks/motion/useMotionProfile";

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

    map.easeTo({ center: [lng, lat], duration: MOTION_MAP_CAMERA_SNAP_MS });
  }, [animate, lat, lng, map]);

  return null;
}
