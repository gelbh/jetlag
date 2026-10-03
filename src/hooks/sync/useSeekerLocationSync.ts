import { getPowerProfile } from "@/domain/device/power/powerProfile";
import { useLiveLocation } from "@/hooks/location/useLiveLocation";
import { useMapStore } from "@/state/mapStore";
import { usePlayerLocationPublish } from "./usePlayerLocationPublish";

interface UseSeekerLocationSyncParams {
  sessionId: string | undefined;
  uid: string | null;
  enabled: boolean;
}

export function useSeekerLocationSync({ sessionId, uid, enabled }: UseSeekerLocationSyncParams) {
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const profile = getPowerProfile(lowPowerMode).seekerLocationSync;
  const { reading, error } = useLiveLocation(enabled, profile);

  usePlayerLocationPublish({ sessionId, uid, enabled, role: "seeker", reading });

  return { error };
}
