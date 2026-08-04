import type { PlayerLocationRecord } from "@/domain/session/activity/sessionChat";
import { LivePlayerLocationsLayer } from "./LivePlayerLocationsLayer";

interface LiveSeekerLocationsLayerProps {
  locations: readonly PlayerLocationRecord[];
  myUid?: string | null;
}

export function LiveSeekerLocationsLayer({
  locations,
  myUid = null,
}: LiveSeekerLocationsLayerProps) {
  return (
    <LivePlayerLocationsLayer
      locations={locations}
      myUid={myUid}
      role="seeker"
    />
  );
}
