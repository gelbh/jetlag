import { useEffect, useState } from "react";
import type { IncidentRecord } from "../../../domain/incident/incidentTypes";
import type { PreloadRequest } from "../../../domain/preloadRequest/preloadRequestTypes";
import { isOpenIncident, subscribeIncidentList } from "../../../services/admin/adminIncidents";
import { subscribePreloadRequestList } from "../../../services/admin/adminPreloadRequests";

const EMPTY_INCIDENTS: IncidentRecord[] = [];
const EMPTY_PRELOAD_REQUESTS: PreloadRequest[] = [];

/** Incident + preload list feeds for the ops desk. */
export function useAdminOpsDeskFeeds(enabled: boolean) {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(enabled);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [preloadRequests, setPreloadRequests] = useState<PreloadRequest[]>([]);
  const [preloadLoading, setPreloadLoading] = useState(enabled);
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [enabledState, setEnabledState] = useState(enabled);

  // Reset loading when admin access flips on (adjust during render — avoids setState-in-effect).
  if (enabled !== enabledState) {
    setEnabledState(enabled);
    if (enabled) {
      setIncidentsLoading(true);
      setIncidentsError(null);
      setPreloadLoading(true);
      setPreloadError(null);
    }
  }

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = subscribeIncidentList(
      (next) => {
        setIncidents(next);
        setIncidentsLoading(false);
      },
      (error) => {
        setIncidentsError(error.message);
        setIncidentsLoading(false);
      },
      { limitCount: 50 },
    );
    return unsubscribe;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    return subscribePreloadRequestList(
      (next) => {
        setPreloadRequests(next);
        setPreloadLoading(false);
      },
      (error) => {
        setPreloadError(error.message);
        setPreloadLoading(false);
      },
    );
  }, [enabled]);

  const visibleIncidents = enabled ? incidents : EMPTY_INCIDENTS;
  const visiblePreloadRequests = enabled ? preloadRequests : EMPTY_PRELOAD_REQUESTS;
  const openIncidentsBySession = new Map<string, number>();
  for (const incident of visibleIncidents) {
    if (incident.sessionId && isOpenIncident(incident)) {
      openIncidentsBySession.set(
        incident.sessionId,
        (openIncidentsBySession.get(incident.sessionId) ?? 0) + 1,
      );
    }
  }

  return {
    visibleIncidents,
    visiblePreloadRequests,
    openIncidentsBySession,
    incidentsLoading,
    incidentsError,
    preloadLoading,
    preloadError,
  };
}
