import { useEffect } from "react";
import { useMapLibreMap } from "../../components/map/helpers/useMapLibreMap";
import { useAdminMonitorFocus } from "../../domain/admin/adminMonitorFocus";
import { usePlayerLocationsSync } from "../../hooks/session/useSessionExtrasSync";
import { useSessionStore } from "../../state/sessionStore";

export function AdminMonitorPlayerFocus() {
  const map = useMapLibreMap();
  const sessionId = useSessionStore((state) => state.session?.id);
  const locations = usePlayerLocationsSync(sessionId);
  const focusedPlayerUid = useAdminMonitorFocus((state) => state.focusedPlayerUid);

  useEffect(() => {
    if (!focusedPlayerUid) {
      return;
    }

    const location = locations.find((entry) => entry.uid === focusedPlayerUid);
    if (!location) {
      return;
    }

    map.flyTo({
      center: [location.lng, location.lat],
      zoom: Math.max(map.getZoom(), 14),
      duration: 500,
    });
  }, [focusedPlayerUid, locations, map]);

  return null;
}
