import { Alert, Box, Button, Drawer, Group, Skeleton, Stack, Text, Title } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { signOut } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import type { AdminTableTab } from "../../../domain/admin/adminTablePrefs";
import { clearLegacyOpsDeskStorage } from "../../../domain/admin/clearLegacyOpsDeskStorage";
import { useAdminAccessState } from "../../../hooks/admin/useAdminAccessState";
import { useAdminJoinSession } from "../../../hooks/admin/useAdminJoinSession";
import { useAdminSessionList } from "../../../hooks/admin/useAdminSessionList";
import { useMinWidth } from "../../../hooks/layout/useMinWidth";
import { useAppNavigate } from "../../../hooks/navigation/useAppNavigate";
import type { AdminSessionSummary } from "../../../services/admin/adminSessions";
import { getFirebaseAuth } from "../../../services/core/firebase/firebase";
import { PremiumSignInGate } from "../../billing/PremiumSignInGate";
import { AppLink } from "../../navigation/AppLink";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import { AdminWorld } from "../shared/AdminWorld";
import type { NeedsYouRow } from "../table/needsYouRows";
import { AdminOpsDeskBody } from "./AdminOpsDeskBody";
import { AdminSettingsPanel } from "./AdminSettingsPanel";
import { AdminStatusStrip } from "./AdminStatusStrip";
import {
  dialogIsOpen,
  focusSearch,
  moveRowFocus,
  PASSIVE_HOTKEY,
  unlessDialog,
} from "./adminDeskKeys";
import type { RouteKind } from "./adminDeskRoute";
import { useAdminDeskMonitor } from "./useAdminDeskMonitor";
import { useAdminDeskSelection } from "./useAdminDeskSelection";
import { useAdminDeskTables } from "./useAdminDeskTables";
import { useAdminOpsDeskFeeds } from "./useAdminOpsDeskFeeds";

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

  const {
    visibleIncidents,
    visiblePreloadRequests,
    openIncidentsBySession,
    incidentsLoading,
    incidentsError,
    preloadLoading,
    preloadError,
  } = useAdminOpsDeskFeeds(enabled);

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

  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const deskRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clearLegacyOpsDeskStorage();
  }, []);

  const tables = useAdminDeskTables({
    sessions,
    incidents: visibleIncidents,
    preloadRequests: visiblePreloadRequests,
    openIncidentsBySession,
    pathname: location.pathname,
    initialKind: location.pathname === PRELOAD_ROUTE ? "preload" : "all",
  });

  const {
    lastItem,
    selectedKey,
    selectedIncident,
    incidentLoading,
    selectedRequest,
    sessionById,
    routeSession,
  } = useAdminDeskSelection({
    enabled,
    pathname: location.pathname,
    routeKind,
    routeSessionId,
    routeIncidentId,
    routeRequestId,
    visibleIncidents,
    visiblePreloadRequests,
    incidentsLoading,
    sessions,
  });

  const monitor = useAdminDeskMonitor({
    enabled,
    isDesktop,
    routeSessionId,
    routeSession,
    joinSession,
    observingCode,
    observeError,
  });

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
          <Alert role="alert" title="Sign-out failed" color="halt">
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
        <AdminOpsDeskBody
          route={{
            isDesktop,
            pathname: location.pathname,
            routeKind,
            routeTab,
            collapsed,
            routeSessionId,
            routeIncidentId,
            routeRequestId,
            routeSession,
          }}
          selection={{
            tables,
            list,
            needsLoading,
            needsError,
            openIncidentsBySession,
            selectedKey,
            lastItemPath: lastItem?.path ?? null,
            selectedIncident,
            incidentLoading,
            selectedRequest,
            sessionById,
            sessionsLoading,
            preloadLoading,
            enabled,
            hasMore,
            refreshing,
            loadingMore,
            sessionsFailedEmpty,
            visibleIncidents,
          }}
          monitor={{
            state: monitor,
            observeError,
            observingCode,
          }}
          actions={{
            onOpenSession: openSession,
            onOpenNeeds: openNeeds,
            onChangeTab: changeTab,
            onGoToTable: goToTable,
            onWatchGame: watchGame,
            onNavigate: (path) => void navigate(path),
            onRefresh: () => void refresh(),
            onLoadMore: () => void loadMore(),
          }}
        />
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
