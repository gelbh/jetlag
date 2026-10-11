import { Alert, AppShell, Button, Group, Modal, Skeleton, Stack, Text, Title } from "@mantine/core";
import { signOut } from "firebase/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import type {
  AdminSessionModeFilter,
  AdminSessionSort,
  AdminSessionStateChip,
} from "../../../domain/admin/adminSessionFilters";
import { filterAdminSessions } from "../../../domain/admin/adminSessionFilters";
import { clearLegacyOpsDeskStorage } from "../../../domain/admin/clearLegacyOpsDeskStorage";
import type { IncidentRecord } from "../../../domain/incident/incidentTypes";
import { useAdminAccessState } from "../../../hooks/admin/useAdminAccessState";
import { useAdminJoinSession } from "../../../hooks/admin/useAdminJoinSession";
import { useAdminSessionList } from "../../../hooks/admin/useAdminSessionList";
import { useMinWidth } from "../../../hooks/layout/useMinWidth";
import { useAppNavigate } from "../../../hooks/navigation/useAppNavigate";
import {
  countOpenIncidents,
  subscribeIncident,
  subscribeIncidentList,
} from "../../../services/admin/adminIncidents";
import type { AdminSessionSummary } from "../../../services/admin/adminSessions";
import { getFirebaseAuth } from "../../../services/core/firebase/firebase";
import { useSessionStore } from "../../../state/sessionStore";
import { PremiumSignInGate } from "../../billing/PremiumSignInGate";
import { AppLink } from "../../navigation/AppLink";
import { InlineError } from "../../ui/banners/InlineError";
import { AdminIncidentActions } from "../incident/AdminIncidentActions";
import { AdminIncidentDetail } from "../incident/AdminIncidentDetail";
import { AdminIncidentInbox } from "../incident/AdminIncidentInbox";
import { AdminMonitorPane } from "../monitor/AdminMonitorPane";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import { AdminWorld } from "../shared/AdminWorld";
import { AdminFixedDesk } from "./AdminFixedDesk";
import { AdminMobileDesk } from "./AdminMobileDesk";
import { AdminSessionFilters } from "./AdminSessionFilters";
import { AdminSessionRow } from "./AdminSessionRow";
import { AdminSettingsPanel } from "./AdminSettingsPanel";
import { AdminStatusStrip } from "./AdminStatusStrip";
import "../incident/AdminIncidentDesk.css";
import "./AdminOpsDesk.css";

const EMPTY_INCIDENTS: IncidentRecord[] = [];

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
  return "/admin";
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
  const selectedIncidentId = routeIncidentId?.trim() || null;
  const onIncidentsRoute = location.pathname.startsWith("/admin/incidents");

  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(enabled);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
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
    refresh,
    loadMore,
  } = useAdminSessionList(enabled);
  const {
    joinSession,
    joiningCode: observingCode,
    error: observeError,
  } = useAdminJoinSession({ onRefresh: refresh });

  const [query, setQuery] = useState("");
  const [liveOnly, setLiveOnly] = useState(true);
  const [annotatedOnly, setAnnotatedOnly] = useState(false);
  const [modeFilter, setModeFilter] = useState<AdminSessionModeFilter>("all");
  const [stateFilter, setStateFilter] = useState<AdminSessionStateChip>(null);
  const [sort, setSort] = useState<AdminSessionSort>("lastActivity");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [monitorSessionId, setMonitorSessionId] = useState<string | null>(null);
  const monitorRequestRef = useRef(0);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (enabled !== enabledState) {
    setEnabledState(enabled);
    if (enabled) {
      setIncidentsLoading(true);
      setIncidentsError(null);
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

  const visibleIncidents = enabled ? incidents : EMPTY_INCIDENTS;
  const openCount = useMemo(() => countOpenIncidents(visibleIncidents), [visibleIncidents]);
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

  const filteredSessions = useMemo(
    () =>
      filterAdminSessions(sessions, {
        query,
        liveOnly,
        annotatedOnly,
        mode: modeFilter,
        state: stateFilter,
        sort,
      }),
    [annotatedOnly, liveOnly, modeFilter, query, sessions, sort, stateFilter],
  );

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
    setMonitorSessionId(null);
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

  const loadMoreButton = hasMore ? (
    <Button
      type="button"
      variant="default"
      fullWidth
      disabled={loadingMore}
      onClick={() => void loadMore()}
    >
      {loadingMore ? "Loading…" : "Load more sessions"}
    </Button>
  ) : null;

  const sessionsErrorRetry = sessionsError ? (
    <Stack gap="sm" mb={sessions.length > 0 ? "sm" : undefined}>
      <InlineError>{sessionsError}</InlineError>
      <Button type="button" variant="default" w="fit-content" onClick={() => void refresh()}>
        Retry
      </Button>
    </Stack>
  ) : null;

  // Fail-only when the list has nothing retained; keep filters + rows when refresh/loadMore fails.
  const sessionsFailedEmpty = Boolean(sessionsError) && sessions.length === 0;

  const sessionsBody = (
    <div className="jl-scroll jl-ops-panel-scroll" data-testid="admin-ops-sessions">
      {observeError ? <InlineError>{observeError}</InlineError> : null}
      {sessionsFailedEmpty ? (
        sessionsErrorRetry
      ) : (
        <>
          {sessionsErrorRetry}
          <div className="mb-3">
            <AdminSessionFilters
              query={query}
              liveOnly={liveOnly}
              annotatedOnly={annotatedOnly}
              mode={modeFilter}
              state={stateFilter}
              sort={sort}
              onQueryChange={setQuery}
              onLiveOnlyChange={setLiveOnly}
              onAnnotatedOnlyChange={setAnnotatedOnly}
              onModeChange={setModeFilter}
              onStateChange={setStateFilter}
              onSortChange={setSort}
            />
          </div>
          {sessionsLoading ? (
            <AdminSessionSkeletonRows />
          ) : sessions.length === 0 ? (
            <div className="jl-ops-empty">
              <p className="jl-ops-empty-title">{liveOnly ? "No live sessions" : "No sessions"}</p>
              <p className="jl-ops-empty-body">Games appear here while a host session is active.</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="space-y-2.5">
              <div className="jl-ops-empty">
                <p className="jl-ops-empty-title">No matching sessions</p>
                <p className="jl-ops-empty-body">Try another code, area name, or phase filter.</p>
              </div>
              {loadMoreButton}
            </div>
          ) : (
            <div className="jl-scroll admin-dashboard-list-scroll space-y-2.5">
              {filteredSessions.map((summary) => (
                <AdminSessionRow
                  key={summary.sessionId}
                  summary={summary}
                  observingCode={observingCode}
                  selected={selectedSessionId === summary.sessionId}
                  onMonitor={handleMonitor}
                />
              ))}
              {loadMoreButton}
            </div>
          )}
        </>
      )}
    </div>
  );

  const incidentDetail = <AdminIncidentDetail incidentId={selectedIncidentId} />;
  const incidentActions = (
    <AdminIncidentActions
      incidentId={selectedIncidentId}
      status={selectedIncident?.status ?? null}
      agent={selectedIncident?.agent ?? null}
      disabled={!selectedIncidentId}
    />
  );
  const inboxBody = (
    <div className="jl-scroll jl-ops-panel-scroll jl-ops-panel-scroll--flush">
      <AdminIncidentInbox
        incidents={visibleIncidents}
        selectedId={selectedIncidentId}
        openCount={openCount}
        loading={enabled ? incidentsLoading : false}
        error={enabled ? incidentsError : null}
        onSelect={handleSelectIncident}
      />
    </div>
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
  const statusStrip = (
    <AdminStatusStrip
      liveCount={liveSessions.length}
      runnerCount={liveSessions.reduce((sum, row) => sum + row.memberCount, 0)}
      needsYouCount={openCount}
      refreshing={refreshing}
      onRefresh={() => void refresh({ background: true })}
      onOpenSettings={() => setSettingsOpen(true)}
    />
  );

  return (
    <AppShell
      mode="static"
      header={{ height: "3.25rem", offset: false }}
      padding={0}
      className="jl-ops-desk"
      data-testid="admin-ops-desk"
      data-admin-shell="mantine-static"
      data-layout={isDesktop ? "desktop" : "mobile"}
      data-resume-ready="true"
    >
      <AppShell.Header withBorder={false}>{statusStrip}</AppShell.Header>
      <AppShell.Main className="jl-ops-desk-main">
        {isDesktop ? (
          <>
            {incidentsError && visibleIncidents.length > 0 ? (
              <InlineError>{incidentsError}</InlineError>
            ) : null}
            <AdminFixedDesk
              mode={onIncidentsRoute ? "incidents" : "sessions"}
              sessions={sessionsBody}
              monitor={
                <div className="jl-scroll jl-ops-panel-scroll jl-ops-panel-scroll--flush">
                  <AdminMonitorPane
                    active={monitorActive}
                    errorMessage={monitorRoleError}
                    sessionsUnavailable={sessionsFailedEmpty}
                  />
                </div>
              }
              inbox={inboxBody}
              detail={
                <div className="jl-scroll jl-ops-panel-scroll jl-ops-panel-scroll--flush">
                  {incidentDetail}
                </div>
              }
              actions={
                <div className="jl-scroll jl-ops-panel-scroll jl-ops-panel-scroll--flush">
                  {incidentActions}
                </div>
              }
            />
          </>
        ) : (
          <AdminMobileDesk
            tab={onIncidentsRoute ? "incidents" : "sessions"}
            onSelectTab={(tab) =>
              void navigate(tab === "incidents" ? "/admin/incidents" : "/admin")
            }
            sessions={sessionsBody}
            incidents={
              selectedIncidentId ? (
                <div className="jl-scroll jl-ops-panel-scroll jl-ops-mobile-drill">
                  <Button
                    type="button"
                    variant="default"
                    className="jl-ops-mobile-back"
                    onClick={() => void navigate("/admin/incidents")}
                  >
                    Back to inbox
                  </Button>
                  {incidentDetail}
                  {incidentActions}
                </div>
              ) : (
                inboxBody
              )
            }
          />
        )}
      </AppShell.Main>
      <Modal opened={settingsOpen} onClose={() => setSettingsOpen(false)} title="Desk settings">
        <AdminSettingsPanel />
      </Modal>
    </AppShell>
  );
}
