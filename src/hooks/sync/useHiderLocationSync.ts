import { getPowerProfile } from "@/domain/device/power/powerProfile";
import { useLiveLocation } from "@/hooks/location/useLiveLocation";
import { useMapStore } from "@/state/mapStore";
import { usePlayerLocationPublish } from "./usePlayerLocationPublish";

interface UseHiderLocationSyncParams {
  sessionId: string | undefined;
  uid: string | null;
  enabled: boolean;
}

export function useHiderLocationSync({ sessionId, uid, enabled }: UseHiderLocationSyncParams) {
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const profile = getPowerProfile(lowPowerMode).hiderLocationSync;
  const { reading, error } = useLiveLocation(enabled, profile);

  usePlayerLocationPublish({ sessionId, uid, enabled, role: "hider", reading });

  return { error };
}
