import { useEffect } from "react";
import { getPowerProfile } from "../../../domain/device/power/powerProfile";
import { useLiveLocation } from "../../../hooks/location/useLiveLocation";
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
  const { reading, error, needsPermissionPrompt } = useLiveLocation(enabled, {
    highAccuracy: highAccuracy ? true : profile.highAccuracy,
    minIntervalMs: profile.minIntervalMs,
    minDistanceMeters: profile.minDistanceMeters,
  });

  useEffect(() => {
    onError?.(error);
  }, [error, onError]);

  useEffect(() => {
    if (needsPermissionPrompt) {
      onError?.(null);
    }
  }, [needsPermissionPrompt, onError]);

  if (!enabled) {
    return null;
  }

  return <UserLocationLayer reading={reading} />;
}

