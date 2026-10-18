import { Alert, Box, Button, Drawer, Group, Skeleton, Stack, Text, Title } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { signOut } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import type { AdminTableTab } from "../../../domain/admin/adminTablePrefs";
import { clearLegacyOpsDeskStorage } from "../../../domain/admin/clearLegacyOpsDeskStorage";
import type { IncidentRecord } from "../../../domain/incident/incidentTypes";
import type { PreloadRequest } from "../../../domain/preloadRequest/preloadRequestTypes";
import { useAdminAccessState } from "../../../hooks/admin/useAdminAccessState";
import { useAdminJoinSession } from "../../../hooks/admin/useAdminJoinSession";
import { useAdminSessionList } from "../../../hooks/admin/useAdminSessionList";
import { useMinWidth } from "../../../hooks/layout/useMinWidth";
import { useAppNavigate } from "../../../hooks/navigation/useAppNavigate";
import {
  isOpenIncident,
  subscribeIncident,
  subscribeIncidentList,
} from "../../../services/admin/adminIncidents";
import { subscribePreloadRequestList } from "../../../services/admin/adminPreloadRequests";
import type { AdminSessionSummary } from "../../../services/admin/adminSessions";
import { getFirebaseAuth } from "../../../services/core/firebase/firebase";
import { useSessionStore } from "../../../state/sessionStore";
import { PremiumSignInGate } from "../../billing/PremiumSignInGate";
import { AppLink } from "../../navigation/AppLink";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import { AdminWorld } from "../shared/AdminWorld";
import type { NeedsYouRow } from "../table/needsYouRows";
import { AdminCaseFile } from "./AdminCaseFile";
import { AdminDeskTable } from "./AdminDeskTable";
import { AdminPhoneList, AdminPhoneSession } from "./AdminPhoneDesk";
import { AdminRequestFile } from "./AdminRequestFile";
import { AdminSessionView, EndedSession } from "./AdminSessionView";
import { AdminSettingsPanel } from "./AdminSettingsPanel";
import { AdminSidebarList } from "./AdminSidebarList";
import { AdminStatusStrip } from "./AdminStatusStrip";
import {
  dialogIsOpen,
  focusSearch,
  moveRowFocus,
  PASSIVE_HOTKEY,
  unlessDialog,
} from "./adminDeskKeys";
import { useAdminDeskTables } from "./useAdminDeskTables";

const EMPTY_INCIDENTS: IncidentRecord[] = [];
const EMPTY_PRELOAD_REQUESTS: PreloadRequest[] = [];

const SESSIONS_ROUTE = "/admin";
const INCIDENTS_ROUTE = "/admin/incidents";
const PRELOAD_ROUTE = "/admin/preload-requests";

function AdminSessionSkeletonRows() {
  return (
    <Stack gap="sm" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} height={80} radius={0} />
      ))}
    </Stack>
  );
}

function continuePathForRoute(pathname: string): string {
  return pathname.startsWith("/admin") ? pathname : SESSIONS_ROUTE;
}

type RouteKind = "table" | "session" | "incident" | "request";

export function AdminOpsDesk() {
  return (
    <AdminWorld>
      <AdminOpsDeskContent />
    </AdminWorld>
  );
}

function AdminOpsDeskContent() {
  const {
    sessionId: rawSessionId,
    incidentId: rawIncidentId,
    requestId: rawRequestId,
  } = useParams<{ sessionId?: string; incidentId?: string; requestId?: string }>();
  const location = useLocation();
  const navigate = useAppNavigate();
  const { state: accessState, user, authReady } = useAdminAccessState();
  const isAdmin = accessState === "admin";
  const enabled = isAdmin;
  const isDesktop = useMinWidth(1024);
  const routeSessionId = rawSessionId?.trim() || null;
  const routeIncidentId = rawIncidentId?.trim() || null;
  const routeRequestId = rawRequestId?.trim() || null;
  const routeKind: RouteKind = routeSessionId
    ? "session"
    : routeIncidentId
      ? "incident"
      : routeRequestId
        ? "request"
        : "table";
  const routeTab: AdminTableTab =
    routeKind === "session" || (routeKind === "table" && location.pathname === SESSIONS_ROUTE)
      ? "sessions"
      : "needs-you";
  const tableRoute =
    routeKind === "session"
      ? SESSIONS_ROUTE
      : routeKind === "incident"
        ? INCIDENTS_ROUTE
        : routeKind === "request"
          ? PRELOAD_ROUTE
          : location.pathname;
  const collapsed = routeKind !== "table";

  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(enabled);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [preloadRequests, setPreloadRequests] = useState<PreloadRequest[]>([]);
  const [preloadLoading, setPreloadLoading] = useState(enabled);
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [enabledState, setEnabledState] = useState(enabled);
  const [fetchedIncident, setFetchedIncident] = useState<IncidentRecord | null>(null);
  const [fetchedFor, setFetchedFor] = useState<string | null>(null);
  const activeSession = useSessionStore((state) => state.session);
  const activeRole = useSessionStore((state) => state.myRole);
  const {
    sessions,
    loading: sessionsLoading,
    refreshing,
    loadingMore,
    hasMore,
    error: sessionsError,
    loadMoreError,
    refresh,
    loadMore,
    lastFetchedAt,
  } = useAdminSessionList(enabled);
  const {
    joinSession,
    joiningCode: observingCode,
    error: observeError,
  } = useAdminJoinSession({ onRefresh: refresh });

  const [monitorSessionId, setMonitorSessionId] = useState<string | null>(null);
  const [failedSessionId, setFailedSessionId] = useState<string | null>(null);
  const monitorRequestRef = useRef(0);
  const joinKeyRef = useRef<string | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastItem, setLastItem] = useState<{ key: string; path: string } | null>(null);
  const [sidebarTab, setSidebarTab] = useState<{ path: string; tab: AdminTableTab } | null>(null);
  const [kindPath, setKindPath] = useState(location.pathname);
  const deskRef = useRef<HTMLDivElement>(null);

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
    clearLegacyOpsDeskStorage();
  }, []);

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

  const tables = useAdminDeskTables({
    sessions,
    incidents: visibleIncidents,
    preloadRequests: visiblePreloadRequests,
    openIncidentsBySession,
    initialKind: location.pathname === PRELOAD_ROUTE ? "preload" : "all",
  });

  // The Kind chip follows the table route it was opened from.
  if (location.pathname !== kindPath) {
    setKindPath(location.pathname);
    if (location.pathname === PRELOAD_ROUTE) tables.setKind("preload");
    else if (location.pathname === INCIDENTS_ROUTE) tables.setKind("all");
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
  if (routeKey && (lastItem?.key !== routeKey || lastItem.path !== location.pathname)) {
    setLastItem({ key: routeKey, path: location.pathname });
  }
  const selectedKey = routeKey ?? lastItem?.key ?? null;

  const monitorRoleError =
    routeSessionId != null &&
    monitorSessionId === routeSessionId &&
    activeSession?.id === routeSessionId &&
    activeRole !== "admin"
      ? (observeError ?? "Couldn't confirm admin monitor role after joining. Try again.")
      : null;

  const monitorActive =
    isDesktop &&
    routeSessionId != null &&
    monitorSessionId === routeSessionId &&
    activeSession?.id === routeSessionId &&
    activeRole === "admin";

  const joinForMonitor = async (summary: Pick<AdminSessionSummary, "sessionId" | "code">) => {
    const requestId = ++monitorRequestRef.current;
    const joined = await joinSession(summary, { navigate: false });
    if (monitorRequestRef.current !== requestId) return;
    if (!joined) {
      setFailedSessionId(summary.sessionId);
      setMonitorSessionId((current) => (current === summary.sessionId ? null : current));
      return;
    }
    setFailedSessionId((current) => (current === summary.sessionId ? null : current));
    setMonitorSessionId(summary.sessionId);
  };

  // Only the session route monitors; incident and request routes never join.
  useEffect(() => {
    if (!enabled || !isDesktop || !routeSessionId) return;
    if (monitorSessionId === routeSessionId && activeSession?.id === routeSessionId) {
      joinKeyRef.current = routeSessionId;
      return;
    }
    if (!routeSession || joinKeyRef.current === routeSessionId) return;
    joinKeyRef.current = routeSessionId;
    void joinForMonitor(routeSession);
  }, [
    activeSession?.id,
    enabled,
    isDesktop,
    joinForMonitor,
    monitorSessionId,
    routeSession,
    routeSessionId,
  ]);

  const retryJoin = () => {
    if (routeSession) void joinForMonitor(routeSession);
  };

  const handleSignOut = async () => {
    setSignOutError(null);
    try {
      await signOut(getFirebaseAuth());
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Could not sign out.");
    }
  };

  const goToTable = () => void navigate(tableRoute);

  useHotkeys([
    ["/", (event) => unlessDialog(event, () => focusSearch(deskRef)), PASSIVE_HOTKEY],
    ["j", (event) => unlessDialog(event, () => moveRowFocus(deskRef, 1)), PASSIVE_HOTKEY],
    ["k", (event) => unlessDialog(event, () => moveRowFocus(deskRef, -1)), PASSIVE_HOTKEY],
    [
      "Escape",
      (event) => {
        if (!collapsed || !isDesktop || dialogIsOpen()) return;
        event.preventDefault();
        goToTable();
      },
      PASSIVE_HOTKEY,
    ],
  ]);

  const openSession = (summary: Pick<AdminSessionSummary, "sessionId">) =>
    void navigate(`/admin/sessions/${encodeURIComponent(summary.sessionId)}`);
  const openNeeds = (row: NeedsYouRow) => {
    if (row.incident) void navigate(`/admin/incidents/${encodeURIComponent(row.incident.id)}`);
    else if (row.request)
      void navigate(`/admin/preload-requests/${encodeURIComponent(row.request.id)}`);
  };
  const changeTab = (tab: AdminTableTab) =>
    void navigate(tab === "sessions" ? SESSIONS_ROUTE : INCIDENTS_ROUTE);
  const watchGame = (summary: AdminSessionSummary) => {
    if (isDesktop) openSession(summary);
    else void joinSession(summary, { navigate: true });
  };

  if (accessState === "loading" || !authReady) {
    return (
      <Stack gap="md" p="md">
        <Button component={AppLink} to="/" variant="default" size="compact-sm" w="fit-content">
          Back
        </Button>
        <AdminSessionSkeletonRows />
      </Stack>
    );
  }

  if (accessState === "unsigned") {
    return (
      <Stack gap="md" p="md" maw={480}>
        <Button component={AppLink} to="/" variant="default" size="compact-sm" w="fit-content">
          Back
        </Button>
        <Stack gap="xs">
          <Title order={1}>Admin event centre</Title>
          <Text size="sm" c="dimmed">
            Sign in with your Google account to open the admin panel.
          </Text>
        </Stack>
        <PremiumSignInGate continuePath={continuePathForRoute(location.pathname)} />
      </Stack>
    );
  }

  if (accessState === "denied") {
    return (
      <Stack gap="md" p="md" maw={480}>
        <Button component={AppLink} to="/" variant="default" size="compact-sm" w="fit-content">
          Back
        </Button>
        <Title order={1}>Access denied</Title>
        <AdminEmptyState
          title="Restricted panel"
          body={`Signed in as ${user?.email ?? "unknown"}. This panel is restricted to the app owner.`}
          action={
            <Group gap="xs" wrap="wrap">
              <Button type="button" onClick={() => void handleSignOut()}>
                Sign out
              </Button>
              <Button component={AppLink} to="/" variant="default">
                Back home
              </Button>
            </Group>
          }
        />
        {signOutError ? (
          <Alert role="alert" title="Sign-out failed" data-tone="mispunch">
            {signOutError}
          </Alert>
        ) : null}
      </Stack>
    );
  }

  const list = {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    onRetry: () => void refresh(),
    hasMore,
    loadingMore,
    loadMoreError,
    onLoadMore: () => void loadMore(),
  };
  const needsLoading =
    enabled && (incidentsLoading || preloadLoading) && tables.needsRows.length === 0;
  const needsError = enabled ? (incidentsError ?? preloadError) : null;
  const liveSessions = sessions.filter((row) => row.isLive);
  const sessionsFailedEmpty = Boolean(sessionsError) && sessions.length === 0;
  const openIncidentForSession = (sessionId: string | null | undefined) =>
    sessionId
      ? visibleIncidents.find((row) => row.sessionId === sessionId && isOpenIncident(row))
      : undefined;

  const statusStrip = (
    <AdminStatusStrip
      liveCount={liveSessions.length}
      runnerCount={liveSessions.reduce((sum, row) => sum + row.memberCount, 0)}
      needsYouCount={tables.needsOpenCount}
      incidentsLoading={enabled && incidentsLoading}
      refreshing={refreshing}
      onRefresh={() => void refresh({ background: true })}
      onOpenSettings={() => setSettingsOpen(true)}
      dataFetchedAt={lastFetchedAt}
      syncFailed={Boolean(sessionsError)}
    />
  );

  const caseFile = routeIncidentId ? (
    <AdminCaseFile
      incidentId={routeIncidentId}
      incident={selectedIncident}
      loading={incidentLoading}
      session={sessionById(selectedIncident?.sessionId)}
      sessionsLoading={sessionsLoading}
      onWatch={watchGame}
      onBack={goToTable}
    />
  ) : null;
  const requestFile = routeRequestId ? (
    <AdminRequestFile
      request={selectedRequest}
      loading={enabled && preloadLoading}
      onBack={goToTable}
    />
  ) : null;

  let body: React.ReactNode;
  if (isDesktop) {
    const sidebarRouteTab = sidebarTab?.path === location.pathname ? sidebarTab.tab : routeTab;
    let main: React.ReactNode = null;
    if (routeKind === "session") {
      const incident = openIncidentForSession(routeSessionId);
      main = (
        <AdminSessionView
          summary={routeSession}
          loading={sessionsLoading}
          openIncidentCount={routeSessionId ? (openIncidentsBySession.get(routeSessionId) ?? 0) : 0}
          onOpenIncident={() =>
            incident && void navigate(`/admin/incidents/${encodeURIComponent(incident.id)}`)
          }
          onBack={goToTable}
          sessionsUnavailable={sessionsFailedEmpty}
          monitor={{
            active: monitorActive,
            roleError: monitorRoleError,
            joinError:
              failedSessionId === routeSessionId
                ? (observeError ?? "Couldn't open the map for this session.")
                : null,
            joining: routeSession != null && observingCode === routeSession.code,
            onRetry: retryJoin,
          }}
        />
      );
    } else if (routeKind === "incident") {
      main = caseFile;
    } else if (routeKind === "request") {
      main = requestFile;
    }
    body = collapsed ? (
      <>
        <AdminSidebarList
          tables={tables}
          tab={sidebarRouteTab}
          onTabChange={(tab) => setSidebarTab({ path: location.pathname, tab })}
          list={list}
          needsLoading={needsLoading}
          needsError={needsError}
          openIncidentsBySession={openIncidentsBySession}
          selectedKey={selectedKey}
          onOpenSession={openSession}
          onOpenNeeds={openNeeds}
          onExpand={goToTable}
        />
        <Box style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex" }}>{main}</Box>
      </>
    ) : (
      <AdminDeskTable
        tables={tables}
        tab={routeTab}
        onTabChange={changeTab}
        list={list}
        needsLoading={needsLoading}
        needsError={needsError}
        selectedKey={selectedKey}
        onOpenSession={openSession}
        onOpenNeeds={openNeeds}
        onCollapse={lastItem ? () => void navigate(lastItem.path) : undefined}
      />
    );
  } else if (collapsed) {
    let item: React.ReactNode = caseFile ?? requestFile;
    if (routeKind === "session") {
      item = routeSession ? (
        <AdminPhoneSession
          summary={routeSession}
          columns={tables.sessionColumns}
          visible={tables.sessionPrefs.visible}
          openIncidentCount={openIncidentsBySession.get(routeSession.sessionId) ?? 0}
          watching={observingCode === routeSession.code}
          onWatch={() => watchGame(routeSession)}
          onOpenIncident={() => {
            const incident = openIncidentForSession(routeSession.sessionId);
            if (incident) void navigate(`/admin/incidents/${encodeURIComponent(incident.id)}`);
          }}
        />
      ) : sessionsLoading ? (
        <Skeleton height={160} radius={16} aria-hidden="true" />
      ) : (
        <EndedSession onBack={goToTable} />
      );
    }
    body = (
      <Stack gap={10} p={10} flex={1} mih={0} style={{ overflow: "auto" }}>
        <Button type="button" variant="subtle" w="fit-content" mih={44} onClick={goToTable}>
          Back
        </Button>
        {observeError && routeKind === "session" ? (
          <Alert role="alert" data-tone="mispunch" title="Couldn't monitor">
            {observeError}
          </Alert>
        ) : null}
        <Box style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: "none" }}>
          {item}
        </Box>
      </Stack>
    );
  } else {
    body = (
      <AdminPhoneList
        tables={tables}
        tab={routeTab}
        onTabChange={changeTab}
        list={list}
        needsLoading={needsLoading}
        needsError={needsError}
        selectedKey={selectedKey}
        onOpenSession={openSession}
        onOpenNeeds={openNeeds}
      />
    );
  }

  return (
    <Box
      ref={deskRef}
      data-testid="admin-ops-desk"
      data-layout={isDesktop ? "desktop" : "mobile"}
      data-resume-ready="true"
      style={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {statusStrip}
      <Box
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: isDesktop ? "row" : "column",
          gap: 12,
          padding: isDesktop ? 12 : 0,
        }}
      >
        {body}
      </Box>
      <Drawer
        opened={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        position="right"
        title="Desk settings"
      >
        <AdminSettingsPanel />
      </Drawer>
    </Box>
  );
}
