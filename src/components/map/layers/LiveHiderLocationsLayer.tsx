import type { PlayerLocationRecord } from "../../../domain/session/activity/sessionChat";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { LivePlayerLocationsLayer } from "./LivePlayerLocationsLayer";

interface LiveHiderLocationsLayerProps {
  locations: readonly PlayerLocationRecord[];
  myUid?: string | null;
}

export function LiveHiderLocationsLayer({
  locations,
  myUid = null,
}: LiveHiderLocationsLayerProps) {
  return (
    <LivePlayerLocationsLayer
      locations={locations}
      myUid={myUid}
      role="hider"
      selfFillColor={MAP_ANNOTATION_COLORS.hidingZoneOwn}
      otherFillColor={MAP_ANNOTATION_COLORS.hidingZone}
    />
  );
}
