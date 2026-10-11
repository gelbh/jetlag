import { useEffect, useRef } from "react";
import { useMapLibreMap } from "../../../components/map/helpers/useMapLibreMap";
import { useAdminMonitorFocus } from "../../../domain/admin/adminMonitorFocus";
import { usePlayerLocationsSync } from "../../../hooks/session/useSessionExtrasSync";
import { useSessionStore } from "../../../state/sessionStore";

export function AdminMonitorPlayerFocus() {
  const map = useMapLibreMap();
  const sessionId = useSessionStore((state) => state.session?.id);
  const locations = usePlayerLocationsSync(sessionId);
  const focusedPlayerUid = useAdminMonitorFocus((state) => state.focusedPlayerUid);
  const focusRequest = useAdminMonitorFocus((state) => state.focusRequest);
  const flownRequestRef = useRef(0);

  useEffect(() => {
    if (!focusedPlayerUid || flownRequestRef.current === focusRequest) {
      return;
    }

    const location = locations.find((entry) => entry.uid === focusedPlayerUid);
    if (!location) {
      return;
    }

    flownRequestRef.current = focusRequest;
    map.flyTo({
      center: [location.lng, location.lat],
      zoom: Math.max(map.getZoom(), 14),
      duration: 500,
    });
  }, [focusedPlayerUid, focusRequest, locations, map]);

  return null;
}
