import {
  Alert,
  AppShell,
  Button,
  Drawer,
  Group,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { signOut } from "firebase/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { clearLegacyOpsDeskStorage } from "../../../domain/admin/clearLegacyOpsDeskStorage";
import type { IncidentRecord } from "../../../domain/incident/incidentTypes";
import type { PreloadRequest } from "../../../domain/preloadRequest/preloadRequestTypes";
import { useAdminAccessState } from "../../../hooks/admin/useAdminAccessState";
import { useAdminJoinSession } from "../../../hooks/admin/useAdminJoinSession";
import { useAdminSessionList } from "../../../hooks/admin/useAdminSessionList";
import { useMinWidth } from "../../../hooks/layout/useMinWidth";
import { useAppNavigate } from "../../../hooks/navigation/useAppNavigate";
import {
  countOpenIncidents,
  isOpenIncident,
  subscribeIncident,
  subscribeIncidentList,
} from "../../../services/admin/adminIncidents";
import {
  countOpenPreloadRequests,
  subscribePreloadRequestList,
} from "../../../services/admin/adminPreloadRequests";
import type { AdminSessionSummary } from "../../../services/admin/adminSessions";
import { getFirebaseAuth } from "../../../services/core/firebase/firebase";
import { useSessionStore } from "../../../state/sessionStore";
import { PremiumSignInGate } from "../../billing/PremiumSignInGate";
import { AppLink } from "../../navigation/AppLink";
import { AdminMonitorPane } from "../monitor/AdminMonitorPane";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import { AdminRegion } from "../shared/AdminRegion";
import { AdminWorld } from "../shared/AdminWorld";
import { AdminMobileBar } from "./AdminMobileBar";
import { AdminNeedsYou, type NeedsYouGroup } from "./AdminNeedsYou";
import { AdminSettingsPanel } from "./AdminSettingsPanel";
import { AdminStartList, START_LIST_GRID_CELLS } from "./AdminStartList";
import { AdminStatusStrip } from "./AdminStatusStrip";

const EMPTY_INCIDENTS: IncidentRecord[] = [];
const EMPTY_PRELOAD_REQUESTS: PreloadRequest[] = [];

function AdminSessionSkeletonRows() {
  return (
    <Stack gap="sm" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} height={80} radius={0} />
      ))}
    </Stack>
  );
}

function continuePathForRoute(pathname: string, incidentId: string | null): string {
  if (incidentId) {
    return `/admin/incidents/${encodeURIComponent(incidentId)}`;
  }
  if (pathname.startsWith("/admin/incidents")) {
    return "/admin/incidents";
  }
  if (pathname.startsWith("/admin/preload-requests")) {
    return "/admin/preload-requests";
  }
  return "/admin";
}

function openGroupsForRoute(pathname: string): NeedsYouGroup[] {
  if (pathname.startsWith("/admin/incidents")) return ["incidents"];
  if (pathname.startsWith("/admin/preload-requests")) return ["preload"];
  return ["incidents", "preload"];
}

export function AdminOpsDesk() {
  return (
    <AdminWorld>
      <AdminOpsDeskContent />
    </AdminWorld>
  );
}

function AdminOpsDeskContent() {
  const { incidentId: routeIncidentId } = useParams<{ incidentId?: string }>();
  const location = useLocation();
  const navigate = useAppNavigate();
  const { state: accessState, user, authReady } = useAdminAccessState();
  const isAdmin = accessState === "admin";
  const enabled = isAdmin;
  const isDesktop = useMinWidth(1024);
  const wide = useMinWidth(1440);
  const selectedIncidentId = routeIncidentId?.trim() || null;
  const onIncidentsRoute = location.pathname.startsWith("/admin/incidents");
  const onPreloadRoute = location.pathname.startsWith("/admin/preload-requests");

  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(enabled);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [preloadRequests, setPreloadRequests] = useState<PreloadRequest[]>([]);
  const [preloadLoading, setPreloadLoading] = useState(enabled);
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [selectedPreloadId, setSelectedPreloadId] = useState<string | null>(null);
  const [enabledState, setEnabledState] = useState(enabled);
  const [fetchedIncident, setFetchedIncident] = useState<IncidentRecord | null>(null);
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

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [monitorSessionId, setMonitorSessionId] = useState<string | null>(null);
  const monitorRequestRef = useRef(0);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [needsYouOpen, setNeedsYouOpen] = useState(onIncidentsRoute || onPreloadRoute);
  const [drawerIncidentId, setDrawerIncidentId] = useState(selectedIncidentId);
  const [openGroups, setOpenGroups] = useState<NeedsYouGroup[]>(() =>
    openGroupsForRoute(location.pathname),
  );
  const [openGroupsPath, setOpenGroupsPath] = useState(location.pathname);

  if (location.pathname !== openGroupsPath) {
    setOpenGroupsPath(location.pathname);
    setOpenGroups(openGroupsForRoute(location.pathname));
    setSelectedPreloadId(null);
    if (onPreloadRoute) {
      setNeedsYouOpen(true);
    }
  }

  if (selectedIncidentId !== drawerIncidentId) {
    setDrawerIncidentId(selectedIncidentId);
    if (selectedIncidentId) {
      setNeedsYouOpen(true);
    }
  }

  if (enabled !== enabledState) {
    setEnabledState(enabled);
    if (enabled) {
      setIncidentsLoading(true);
      setIncidentsError(null);
      setPreloadLoading(true);
      setPreloadError(null);
    }
  }

  if (needsYouOpen && (wide || !isDesktop)) {
    setNeedsYouOpen(false);
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
  const openCount = useMemo(() => countOpenIncidents(visibleIncidents), [visibleIncidents]);
  const visiblePreloadRequests = enabled ? preloadRequests : EMPTY_PRELOAD_REQUESTS;
  const needsYouCount = openCount + countOpenPreloadRequests(visiblePreloadRequests);
  const selectedPreload =
    visiblePreloadRequests.find((request) => request.id === selectedPreloadId) ?? null;
  if (selectedPreloadId && !selectedPreload) {
    setSelectedPreloadId(null);
  }
  const mispunchBySession = new Map<string, number>();
  for (const incident of visibleIncidents) {
    if (incident.sessionId && isOpenIncident(incident)) {
      mispunchBySession.set(
        incident.sessionId,
        (mispunchBySession.get(incident.sessionId) ?? 0) + 1,
      );
    }
  }
  const listIncident =
    selectedIncidentId == null
      ? null
      : (visibleIncidents.find((row) => row.id === selectedIncidentId) ?? null);
  const listHasSelected = listIncident != null;

  useEffect(() => {
    if (!enabled || incidentsLoading || !selectedIncidentId || listHasSelected) return;
    return subscribeIncident(
      selectedIncidentId,
      (next) => setFetchedIncident(next),
      () => setFetchedIncident(null),
    );
  }, [enabled, incidentsLoading, listHasSelected, selectedIncidentId]);

  const selectedIncident =
    listIncident ??
    (enabled && fetchedIncident?.id === selectedIncidentId ? fetchedIncident : null);

  const monitorRoleError =
    monitorSessionId != null && activeSession?.id === monitorSessionId && activeRole !== "admin"
      ? (observeError ?? "Couldn't confirm admin monitor role after joining. Try again.")
      : null;

  const monitorActive =
    isDesktop &&
    monitorSessionId != null &&
    activeSession?.id === monitorSessionId &&
    activeRole === "admin";

  const joinForMonitor = useCallback(
    async (summary: Pick<AdminSessionSummary, "sessionId" | "code">) => {
      const requestId = ++monitorRequestRef.current;
      const joined = await joinSession(summary, { navigate: !isDesktop });
      if (monitorRequestRef.current !== requestId) return;
      if (!joined) {
        setSelectedSessionId((current) => (current === summary.sessionId ? null : current));
        setMonitorSessionId((current) => (current === summary.sessionId ? null : current));
        return;
      }
      setSelectedSessionId(summary.sessionId);
      if (isDesktop) {
        setMonitorSessionId(summary.sessionId);
      }
    },
    [isDesktop, joinSession],
  );

  const handleMonitor = (summary: AdminSessionSummary) => {
    setSelectedSessionId(summary.sessionId);
    // Rejoining the open course remounts the embedded map; skip it.
    if (monitorActive && monitorSessionId === summary.sessionId) {
      return;
    }
    if (observingCode === summary.code) {
      return;
    }
    void joinForMonitor(summary);
  };

  const incidentMonitorKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isDesktop || !selectedIncidentId) {
      return;
    }
    const incident = selectedIncident;
    if (!incident?.sessionId || !incident.sessionCode) {
      return;
    }
    if (monitorSessionId === incident.sessionId) {
      incidentMonitorKeyRef.current = selectedIncidentId;
      return;
    }
    if (incidentMonitorKeyRef.current === selectedIncidentId) {
      return;
    }
    const fromList = sessions.find((row) => row.sessionId === incident.sessionId);
    if (!fromList && !listIncident) {
      return;
    }
    incidentMonitorKeyRef.current = selectedIncidentId;

    const summary = fromList ?? {
      sessionId: incident.sessionId,
      code: incident.sessionCode,
    };

    void joinForMonitor(summary);
  }, [
    isDesktop,
    joinForMonitor,
    listIncident,
    monitorSessionId,
    selectedIncident,
    selectedIncidentId,
    sessions,
  ]);

  const handleSelectIncident = (incidentId: string) => {
    void navigate(`/admin/incidents/${encodeURIComponent(incidentId)}`);
  };

  const handleSignOut = async () => {
    setSignOutError(null);
    try {
      await signOut(getFirebaseAuth());
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Could not sign out.");
    }
  };

  const sessionsFailedEmpty = Boolean(sessionsError) && sessions.length === 0;

  const sessionsBody = (
    <AdminStartList
      sessions={sessions}
      loading={sessionsLoading}
      error={sessionsError}
      onRetry={() => void refresh()}
      hasMore={hasMore}
      loadingMore={loadingMore}
      loadMoreError={loadMoreError}
      onLoadMore={() => void loadMore()}
      observingCode={observingCode}
      joinError={observeError}
      monitoredSessionId={selectedSessionId}
      mispunchBySession={mispunchBySession}
      onMonitor={handleMonitor}
    />
  );

  const needsYou = (
    <AdminNeedsYou
      incidents={visibleIncidents}
      incidentsLoading={enabled ? incidentsLoading : false}
      incidentsError={enabled ? incidentsError : null}
      selectedIncidentId={selectedIncidentId}
      selectedIncident={selectedIncident}
      onSelectIncident={handleSelectIncident}
      onBackFromIncident={() => void navigate("/admin/incidents")}
      preloadRequests={visiblePreloadRequests}
      preloadLoading={enabled ? preloadLoading : false}
      preloadError={enabled ? preloadError : null}
      selectedPreload={selectedPreload}
      onSelectPreload={setSelectedPreloadId}
      openGroups={openGroups}
      onOpenGroupsChange={setOpenGroups}
    />
  );

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
        <PremiumSignInGate
          continuePath={continuePathForRoute(location.pathname, selectedIncidentId)}
        />
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

  const liveSessions = sessions.filter((row) => row.isLive);
  const mobileSection = onIncidentsRoute || onPreloadRoute ? "needs-you" : "start-list";
  const statusStrip = (
    <AdminStatusStrip
      liveCount={liveSessions.length}
      runnerCount={liveSessions.reduce((sum, row) => sum + row.memberCount, 0)}
      needsYouCount={needsYouCount}
      inQueueCount={visibleIncidents.length}
      incidentsLoading={enabled && incidentsLoading}
      refreshing={refreshing}
      onRefresh={() => void refresh({ background: true })}
      onOpenSettings={() => setSettingsOpen(true)}
      onOpenNeedsYou={isDesktop && !wide ? () => setNeedsYouOpen(true) : undefined}
      dataFetchedAt={lastFetchedAt}
      syncFailed={Boolean(sessionsError)}
    />
  );

  return (
    <AppShell
      mode="static"
      header={{ height: "3.25rem", offset: false }}
      navbar={
        isDesktop
          ? {
              // Grid cells plus the navbar's xs padding and border.
              width: `calc(var(--adm-cell) * ${START_LIST_GRID_CELLS} + 1.5rem)`,
              breakpoint: "64em",
              collapsed: { mobile: true },
            }
          : undefined
      }
      aside={
        isDesktop
          ? { width: "24rem", breakpoint: "64em", collapsed: { mobile: true, desktop: !wide } }
          : undefined
      }
      footer={isDesktop ? undefined : { height: "calc(3.5rem + env(safe-area-inset-bottom))" }}
      padding={0}
      // Fill .app-scroll-root; no display:flex here (fights the static AppShell grid).
      h="100%"
      mih={0}
      style={{ overflow: "hidden" }}
      data-testid="admin-ops-desk"
      data-admin-shell="mantine-static"
      data-layout={isDesktop ? "desktop" : "mobile"}
      data-resume-ready="true"
    >
      <AppShell.Header withBorder={false}>{statusStrip}</AppShell.Header>
      {isDesktop ? (
        <AppShell.Navbar mih={0} p="xs">
          {sessionsBody}
        </AppShell.Navbar>
      ) : null}
      <AppShell.Main
        display="flex"
        mih={0}
        p={isDesktop ? "xs" : undefined}
        style={{ flexDirection: "column", overflow: "hidden" }}
      >
        {isDesktop ? (
          <AdminRegion title="Course" scroll={false}>
            <AdminMonitorPane
              active={monitorActive}
              errorMessage={monitorRoleError}
              sessionsUnavailable={sessionsFailedEmpty}
            />
          </AdminRegion>
        ) : mobileSection === "needs-you" ? (
          <ScrollArea flex={1} mih={0} type="auto" offsetScrollbars>
            {needsYou}
          </ScrollArea>
        ) : (
          sessionsBody
        )}
      </AppShell.Main>
      {isDesktop ? null : (
        <AppShell.Footer p="xs" pb="calc(var(--mantine-spacing-xs) + env(safe-area-inset-bottom))">
          <AdminMobileBar
            value={mobileSection}
            onChange={(section) =>
              void navigate(section === "needs-you" ? "/admin/incidents" : "/admin")
            }
          />
        </AppShell.Footer>
      )}
      {isDesktop && wide ? (
        <AppShell.Aside mih={0} p="xs">
          <AdminRegion title="Needs you" count={needsYouCount}>
            {needsYou}
          </AdminRegion>
        </AppShell.Aside>
      ) : null}
      <Drawer
        opened={needsYouOpen}
        onClose={() => setNeedsYouOpen(false)}
        position="right"
        size="24rem"
        title="Needs you"
        closeOnEscape={!selectedIncidentId && !selectedPreload}
      >
        {needsYou}
      </Drawer>
      <Drawer
        opened={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        position="right"
        title="Desk settings"
      >
        <AdminSettingsPanel />
      </Drawer>
    </AppShell>
  );
}
