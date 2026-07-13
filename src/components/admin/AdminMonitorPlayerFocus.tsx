import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { useAdminMonitorFocus } from "../../domain/admin/adminMonitorFocus";
import { usePlayerLocationsSync } from "../../hooks/session/useSessionExtrasSync";
import { useSessionStore } from "../../state/sessionStore";

export function AdminMonitorPlayerFocus() {
  const map = useMap();
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

    map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), 14), {
      duration: 0.5,
    });
  }, [focusedPlayerUid, locations, map]);

  return null;
}
