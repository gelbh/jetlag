import type { PlayerLocationRecord } from "../../../domain/session/activity/sessionChat";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
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
      selfFillColor={MAP_ANNOTATION_COLORS.userLocation}
      otherFillColor={MAP_ANNOTATION_COLORS.seekerLive}
    />
  );
}
