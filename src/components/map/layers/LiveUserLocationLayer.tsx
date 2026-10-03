import { useEffect } from "react";
import { getPowerProfile } from "@/domain/device/power/powerProfile";
import { useLiveLocation } from "@/hooks/location/useLiveLocation";
import type { GeolocationReading } from "@/services/core/location/geolocation";
import { UserLocationLayer } from "./UserLocationLayer";

interface LiveUserLocationLayerProps {
  enabled: boolean;
  highAccuracy?: boolean;
  lowPowerMode?: boolean;
  /** When set (including null), skip the layer-owned watch and render this reading. */
  reading?: GeolocationReading | null;
  onError?: (error: string | null) => void;
}

function HookOwnedLiveUserLocationLayer({
  enabled,
  highAccuracy = false,
  lowPowerMode = false,
  onError,
}: Omit<LiveUserLocationLayerProps, "reading">) {
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

function ExternalReadingUserLocationLayer({
  enabled,
  reading,
}: {
  enabled: boolean;
  reading: GeolocationReading | null;
}) {
  if (!enabled) {
    return null;
  }

  return <UserLocationLayer reading={reading} />;
}

export function LiveUserLocationLayer({ reading, ...rest }: LiveUserLocationLayerProps) {
  if (reading !== undefined) {
    return <ExternalReadingUserLocationLayer enabled={rest.enabled} reading={reading} />;
  }

  return <HookOwnedLiveUserLocationLayer {...rest} />;
}
