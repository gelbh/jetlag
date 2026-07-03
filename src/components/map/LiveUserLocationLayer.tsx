import { useEffect } from "react";
import { useLiveLocation } from "../../hooks/useLiveLocation";
import { UserLocationLayer } from "./UserLocationLayer";

interface LiveUserLocationLayerProps {
  enabled: boolean;
  highAccuracy?: boolean;
  onError?: (error: string | null) => void;
}

export function LiveUserLocationLayer({
  enabled,
  highAccuracy = false,
  onError,
}: LiveUserLocationLayerProps) {
  const { reading, error } = useLiveLocation(enabled, {
    highAccuracy,
    minIntervalMs: 1500,
    minDistanceMeters: 5,
  });

  useEffect(() => {
    onError?.(error);
  }, [error, onError]);

  if (!enabled) {
    return null;
  }

  return <UserLocationLayer reading={reading} />;
}

