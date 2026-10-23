import { useEffect, useState } from "react";
import type { IncidentRecord } from "../../../domain/incident/incidentTypes";
import type { PreloadRequest } from "../../../domain/preloadRequest/preloadRequestTypes";
import { subscribeIncident } from "../../../services/admin/adminIncidents";
import type { AdminSessionSummary } from "../../../services/admin/adminSessions";
import type { NeedsYouKind } from "./useAdminDeskTables";

type RouteKind = "table" | "session" | "incident" | "request";

interface Inputs {
  enabled: boolean;
  pathname: string;
  preloadRoute: string;
  setKind: (kind: NeedsYouKind) => void;
  routeKind: RouteKind;
  routeSessionId: string | null;
  routeIncidentId: string | null;
  routeRequestId: string | null;
  visibleIncidents: readonly IncidentRecord[];
  visiblePreloadRequests: readonly PreloadRequest[];
  incidentsLoading: boolean;
  sessions: readonly AdminSessionSummary[];
}

/** Route selection, Kind chip path sync, and incident deep-link fetch. */
export function useAdminDeskSelection({
  enabled,
  pathname,
  preloadRoute,
  setKind,
  routeKind,
  routeSessionId,
  routeIncidentId,
  routeRequestId,
  visibleIncidents,
  visiblePreloadRequests,
  incidentsLoading,
  sessions,
}: Inputs) {
  const [fetchedIncident, setFetchedIncident] = useState<IncidentRecord | null>(null);
  const [fetchedFor, setFetchedFor] = useState<string | null>(null);
  const [lastItem, setLastItem] = useState<{ key: string; path: string } | null>(null);
  const [kindPath, setKindPath] = useState(pathname);

  // Kind follows preload table entry/exit only; incident detail must not reset it.
  // Adjust during render — avoids setState-in-effect (same pattern as map landscape chrome).
  if (pathname !== kindPath) {
    const previousPath = kindPath;
    setKindPath(pathname);
    if (pathname === preloadRoute) setKind("preload");
    else if (previousPath === preloadRoute) setKind("all");
  }

  const listIncident =
    routeIncidentId == null
      ? null
      : (visibleIncidents.find((row) => row.id === routeIncidentId) ?? null);
  const listHasSelected = listIncident != null;

  useEffect(() => {
    if (!enabled || incidentsLoading || !routeIncidentId || listHasSelected) return;
    return subscribeIncident(
      routeIncidentId,
      (next) => {
        setFetchedIncident(next);
        setFetchedFor(routeIncidentId);
      },
      () => {
        setFetchedIncident(null);
        setFetchedFor(routeIncidentId);
      },
    );
  }, [enabled, incidentsLoading, listHasSelected, routeIncidentId]);

  const selectedIncident =
    listIncident ?? (enabled && fetchedIncident?.id === routeIncidentId ? fetchedIncident : null);
  const incidentLoading =
    incidentsLoading ||
    (!listHasSelected && routeIncidentId != null && fetchedFor !== routeIncidentId);
  const selectedRequest =
    routeRequestId == null
      ? null
      : (visiblePreloadRequests.find((request) => request.id === routeRequestId) ?? null);

  const sessionById = (id: string | null | undefined) =>
    id ? (sessions.find((row) => row.sessionId === id) ?? null) : null;
  const routeSession = sessionById(routeSessionId);

  const routeKey =
    routeKind === "session"
      ? routeSessionId
      : routeKind === "incident"
        ? `incident:${routeIncidentId}`
        : routeKind === "request"
          ? `preload:${routeRequestId}`
          : null;
  // Remember last opened item for collapse-from-table (adjust during render).
  if (routeKey && (lastItem?.key !== routeKey || lastItem.path !== pathname)) {
    setLastItem({ key: routeKey, path: pathname });
  }
  const selectedKey = routeKey ?? lastItem?.key ?? null;

  return {
    lastItem,
    selectedKey,
    selectedIncident,
    incidentLoading,
    selectedRequest,
    sessionById,
    routeSession,
  };
}
