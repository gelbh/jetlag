import { useEffect } from "react";
import { getPowerProfile } from "../../domain/powerProfile";
import { useLiveLocation } from "../../hooks/useLiveLocation";
import { UserLocationLayer } from "./UserLocationLayer";

interface LiveUserLocationLayerProps {
  enabled: boolean;
  highAccuracy?: boolean;
  lowPowerMode?: boolean;
  onError?: (error: string | null) => void;
}

export function LiveUserLocationLayer({
  enabled,
  highAccuracy = false,
  lowPowerMode = false,
  onError,
}: LiveUserLocationLayerProps) {
  const profile = getPowerProfile(lowPowerMode).liveLocation;
  const { reading, error } = useLiveLocation(enabled, {
    highAccuracy: highAccuracy ? true : profile.highAccuracy,
    minIntervalMs: profile.minIntervalMs,
    minDistanceMeters: profile.minDistanceMeters,
  });

  useEffect(() => {
    onError?.(error);
  }, [error, onError]);

  if (!enabled) {
    return null;
  }

  return <UserLocationLayer reading={reading} />;
}

