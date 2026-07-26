import { signOut } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { AppLink } from "../navigation/AppLink";
import { PremiumSignInGate } from "../billing/PremiumSignInGate";
import { EntryScreenLayout } from "../ui/EntryScreenLayout";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../ui/ScreenHeader";
import { InlineError } from "../ui/InlineError";
import { isAdminUser } from "../../domain/admin/adminAccess";
import { filterAdminSessions } from "../../domain/admin/adminSessionFilters";
import type {
  AdminSessionModeFilter,
  AdminSessionSort,
  AdminSessionStateChip,
} from "../../domain/admin/adminSessionFilters";
import {
  CUSTOM_PRESET_ID,
  PANEL_IDS,
  cloneLayout,
  deleteUserPreset,
  ensureIncidentPanelsVisible,
  hidePanel,
  layoutsEqual,
  mergePanelOntoStack,
  resolvePresetLayout,
  setCollapsed,
  setPinned,
  setStackActiveIndex,
  upsertUserPreset,
  type DeskLayout,
  type PanelId,
} from "../../domain/admin/opsDeskLayout";
import {
  loadOpsDeskStore,
  saveOpsDeskStore,
  type OpsDeskStoreV1,
} from "../../domain/admin/opsDeskPersistence";
import type { IncidentRecord } from "../../domain/incident/incidentTypes";
import { useAdminJoinSession } from "../../hooks/admin/useAdminJoinSession";
import { useAdminSessionList } from "../../hooks/admin/useAdminSessionList";
import { usePermanentAuthUser } from "../../hooks/billing/usePermanentAuthUser";
import { useAppNavigate } from "../../hooks/useAppNavigate";
import { useMinWidth } from "../../hooks/useMinWidth";
import {
  countOpenIncidents,
  subscribeIncidentList,
} from "../../services/admin/adminIncidents";
import type { AdminSessionSummary } from "../../services/admin/adminSessions";
import { getFirebaseAuth } from "../../services/core/firebase";
import { useSessionStore } from "../../state/sessionStore";
import { AdminDeskTopbar } from "./AdminDeskTopbar";
import { AdminGridWorkspace } from "./AdminGridWorkspace";
import { AdminIncidentActions } from "./AdminIncidentActions";
import { AdminIncidentDetail } from "./AdminIncidentDetail";
import { AdminIncidentInbox } from "./AdminIncidentInbox";
import { AdminMobileDesk } from "./AdminMobileDesk";
import { AdminMonitorPane } from "./AdminMonitorPane";
import type { AdminPanelBodies } from "./AdminPanelBody";
import type { PanelMergePayload } from "./AdminPanelStack";
import { AdminSessionFilters } from "./AdminSessionFilters";
import { AdminSessionRow } from "./AdminSessionRow";
import { AdminSettingsPanel } from "./AdminSettingsPanel";
import "./AdminIncidentDesk.css";
import "./AdminOpsDesk.css";

const EMPTY_INCIDENTS: IncidentRecord[] = [];

function AdminSessionSkeletonRows() {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="home-card-btn home-card-btn-secondary h-[6.5rem] animate-pulse bg-surface-raised/40"
        />
      ))}
    </div>
  );
}

function continuePathForRoute(
  pathname: string,
  incidentId: string | null,
): string {
  if (incidentId) {
    return `/admin/incidents/${encodeURIComponent(incidentId)}`;
  }
  if (pathname.startsWith("/admin/incidents")) {
    return "/admin/incidents";
  }
  return "/admin";
}

function firstVisiblePanel(layout: DeskLayout): PanelId {
  return layout.stacks[0]?.panelIds[0] ?? "sessions";
}

export function AdminOpsDesk() {
  const { incidentId: routeIncidentId } = useParams<{ incidentId?: string }>();
  const location = useLocation();
  const navigate = useAppNavigate();
  const { user, isPermanent, authReady } = usePermanentAuthUser();
  const isAdmin = isAdminUser(user);
  const enabled = authReady && isAdmin;
  const isDesktop = useMinWidth(1024);
  const selectedIncidentId = routeIncidentId?.trim() || null;
  const onIncidentsRoute = location.pathname.startsWith("/admin/incidents");

  const [store, setStore] = useState<OpsDeskStoreV1>(() =>
    loadOpsDeskStore(user?.uid ?? null),
  );
  const [storeUid, setStoreUid] = useState<string | null>(user?.uid ?? null);
  const [now, setNow] = useState(() => new Date());
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(enabled);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [enabledState, setEnabledState] = useState(enabled);
  const [deepLinkKey, setDeepLinkKey] = useState<string | null>(null);

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
    setError: setObserveError,
  } = useAdminJoinSession({ onRefresh: refresh });

  const [query, setQuery] = useState("");
  const [liveOnly, setLiveOnly] = useState(false);
  const [annotatedOnly, setAnnotatedOnly] = useState(false);
  const [modeFilter, setModeFilter] = useState<AdminSessionModeFilter>("all");
  const [stateFilter, setStateFilter] = useState<AdminSessionStateChip>(null);
  const [sort, setSort] = useState<AdminSessionSort>("lastActivity");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [monitorSessionId, setMonitorSessionId] = useState<string | null>(null);

  const uid = user?.uid ?? null;

  if (uid !== storeUid) {
    setStoreUid(uid);
    setStore(loadOpsDeskStore(uid));
    setDeepLinkKey(null);
  }

  if (enabled !== enabledState) {
    setEnabledState(enabled);
    if (enabled) {
      setIncidentsLoading(true);
      setIncidentsError(null);
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
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

  const persistStore = useCallback(
    (next: OpsDeskStoreV1) => {
      setStore(next);
      saveOpsDeskStore(uid, next);
    },
    [uid],
  );

  const deskLayout = useMemo(
    () =>
      resolvePresetLayout(
        store.activePresetId,
        store.customLayout,
        store.userPresets,
      ),
    [store.activePresetId, store.customLayout, store.userPresets],
  );

  const mutateLayout = useCallback(
    (mutator: (layout: DeskLayout) => DeskLayout) => {
      setStore((prev) => {
        const current = resolvePresetLayout(
          prev.activePresetId,
          prev.customLayout,
          prev.userPresets,
        );
        const nextLayout = mutator(current);
        if (layoutsEqual(current, nextLayout)) return prev;
        const next: OpsDeskStoreV1 = {
          ...prev,
          activePresetId: CUSTOM_PRESET_ID,
          customLayout: nextLayout,
        };
        saveOpsDeskStore(uid, next);
        return next;
      });
    },
    [uid],
  );

  useEffect(() => {
    if (!enabled || !onIncidentsRoute) return;
    const key = `${location.pathname}:${uid ?? "anon"}`;
    if (deepLinkKey === key) return;

    setStore((prev) => {
      const current = resolvePresetLayout(
        prev.activePresetId,
        prev.customLayout,
        prev.userPresets,
      );
      const ensured = ensureIncidentPanelsVisible(current);
      const layoutChanged = !layoutsEqual(current, ensured);
      const nextMobile: PanelId =
        selectedIncidentId != null
          ? "detail"
          : prev.lastMobilePanelId &&
              (PANEL_IDS as readonly string[]).includes(prev.lastMobilePanelId)
            ? prev.lastMobilePanelId
            : "inbox";

      const next: OpsDeskStoreV1 = {
        ...prev,
        activePresetId: layoutChanged ? CUSTOM_PRESET_ID : prev.activePresetId,
        customLayout: layoutChanged ? ensured : prev.customLayout,
        lastMobilePanelId: nextMobile,
      };
      saveOpsDeskStore(uid, next);
      return next;
    });
    setDeepLinkKey(key);
  }, [
    deepLinkKey,
    enabled,
    location.pathname,
    onIncidentsRoute,
    selectedIncidentId,
    uid,
  ]);

  const visibleIncidents = enabled ? incidents : EMPTY_INCIDENTS;
  const openCount = useMemo(
    () => countOpenIncidents(visibleIncidents),
    [visibleIncidents],
  );

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
    monitorSessionId != null &&
    activeSession?.id === monitorSessionId &&
    activeRole !== "admin"
      ? (observeError ??
        "Couldn't confirm admin monitor role after joining. Try again.")
      : null;

  const monitorActive =
    isDesktop &&
    monitorSessionId != null &&
    activeSession?.id === monitorSessionId &&
    activeRole === "admin";

  const handleMonitor = useCallback(
    async (summary: AdminSessionSummary) => {
      setObserveError(null);
      setSelectedSessionId(summary.sessionId);
      setMonitorSessionId(null);

      if (isDesktop) {
        const joined = await joinSession(summary, { navigate: false });
        if (!joined) {
          setSelectedSessionId(null);
          return;
        }
        setMonitorSessionId(summary.sessionId);
        return;
      }

      const joined = await joinSession(summary, { navigate: true });
      if (!joined) {
        setSelectedSessionId(null);
      }
    },
    [isDesktop, joinSession, setObserveError],
  );

  const handleSelectIncident = (incidentId: string) => {
    void navigate(`/admin/incidents/${encodeURIComponent(incidentId)}`);
  };

  const handleSignOut = async () => {
    await signOut(getFirebaseAuth());
  };

  const handleSelectPreset = (presetId: string) => {
    setStore((prev) => {
      const layout = resolvePresetLayout(
        presetId,
        prev.customLayout,
        prev.userPresets,
      );
      const next: OpsDeskStoreV1 = {
        ...prev,
        activePresetId: presetId,
        lastMobilePanelId: firstVisiblePanel(layout),
      };
      saveOpsDeskStore(uid, next);
      return next;
    });
  };

  const handleSaveCurrent = () => {
    const name = window.prompt("Save current layout as…");
    if (name == null) return;
    const existing = store.userPresets.find(
      (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (existing) {
      const ok = window.confirm(`Overwrite preset “${existing.name}”?`);
      if (!ok) return;
    }
    const result = upsertUserPreset(
      store.userPresets,
      name,
      deskLayout,
      existing ? { overwriteId: existing.id } : undefined,
    );
    if (!result.ok) {
      window.alert("Preset name cannot be empty.");
      return;
    }
    persistStore({
      ...store,
      activePresetId: result.preset.id,
      userPresets: result.presets,
      customLayout: cloneLayout(deskLayout),
    });
  };

  const handleDeleteUserPreset = (presetId: string) => {
    persistStore({
      ...store,
      userPresets: deleteUserPreset(store.userPresets, presetId),
      activePresetId:
        store.activePresetId === presetId
          ? CUSTOM_PRESET_ID
          : store.activePresetId,
    });
  };

  const mobilePanelId: PanelId =
    store.lastMobilePanelId &&
    (PANEL_IDS as readonly string[]).includes(store.lastMobilePanelId)
      ? store.lastMobilePanelId
      : onIncidentsRoute
        ? "inbox"
        : "sessions";

  const loadMoreButton = hasMore ? (
    <button
      type="button"
      className="btn-secondary min-h-10 w-full"
      disabled={loadingMore}
      onClick={() => void loadMore()}
    >
      {loadingMore ? "Loading…" : "Load more sessions"}
    </button>
  ) : null;

  const sessionsBody = (
    <div className="jl-ops-panel-scroll" data-testid="admin-ops-sessions">
      {sessionsError ? <InlineError>{sessionsError}</InlineError> : null}
      {observeError ? <InlineError>{observeError}</InlineError> : null}
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
          <p className="jl-ops-empty-title">No live sessions</p>
          <p className="jl-ops-empty-body">
            Games appear here while a host session is active.
          </p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="space-y-2.5">
          <div className="jl-ops-empty">
            <p className="jl-ops-empty-title">No matching sessions</p>
            <p className="jl-ops-empty-body">
              Try another code, area name, or phase filter.
            </p>
          </div>
          {loadMoreButton}
        </div>
      ) : (
        <div className="admin-dashboard-list-scroll space-y-2.5">
          {filteredSessions.map((summary) => (
            <AdminSessionRow
              key={summary.sessionId}
              summary={summary}
              observingCode={observingCode}
              selected={selectedSessionId === summary.sessionId}
              onMonitor={(nextSummary) => void handleMonitor(nextSummary)}
            />
          ))}
          {loadMoreButton}
        </div>
      )}
    </div>
  );

  const bodies: AdminPanelBodies = {
    sessions: sessionsBody,
    monitor: (
      <div className="jl-ops-panel-scroll jl-ops-panel-scroll--flush">
        <AdminMonitorPane
          active={monitorActive}
          sessionCode={activeSession?.code ?? null}
          errorMessage={monitorRoleError}
        />
      </div>
    ),
    inbox: (
      <div className="jl-ops-panel-scroll jl-ops-panel-scroll--flush">
        <AdminIncidentInbox
          incidents={visibleIncidents}
          selectedId={selectedIncidentId}
          openCount={openCount}
          loading={enabled ? incidentsLoading : false}
          error={enabled ? incidentsError : null}
          onSelect={handleSelectIncident}
        />
      </div>
    ),
    detail: (
      <div className="jl-ops-panel-scroll jl-ops-panel-scroll--flush">
        <AdminIncidentDetail incidentId={selectedIncidentId} />
      </div>
    ),
    actions: (
      <div className="jl-ops-panel-scroll jl-ops-panel-scroll--flush">
        <AdminIncidentActions
          incidentId={selectedIncidentId}
          disabled={!selectedIncidentId}
        />
      </div>
    ),
    settings: <AdminSettingsPanel />,
  };

  if (!authReady) {
    return (
      <EntryScreenLayout justify="start">
        <ScreenHeader backTo="/" backLabel="Back" />
        <div className={screenHeaderOffsetClassName}>
          <AdminSessionSkeletonRows />
        </div>
      </EntryScreenLayout>
    );
  }

  if (!isPermanent || !user) {
    return (
      <EntryScreenLayout justify="start">
        <ScreenHeader backTo="/" backLabel="Back" />
        <div className={`space-y-4 ${screenHeaderOffsetClassName}`}>
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">
              Admin ops desk
            </h1>
            <p className="text-sm text-ink-muted">
              Sign in with your Google account to open the admin panel.
            </p>
          </div>
          <PremiumSignInGate
            continuePath={continuePathForRoute(
              location.pathname,
              selectedIncidentId,
            )}
          />
        </div>
      </EntryScreenLayout>
    );
  }

  if (!isAdmin) {
    return (
      <EntryScreenLayout justify="start">
        <ScreenHeader backTo="/" backLabel="Back" />
        <div className={`space-y-4 ${screenHeaderOffsetClassName}`}>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">
            Access denied
          </h1>
          <p className="text-sm text-ink-muted">
            Signed in as {user.email ?? "unknown"}. This panel is restricted to
            the app owner.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary min-h-11 px-4"
              onClick={() => void handleSignOut()}
            >
              Sign out
            </button>
            <AppLink
              to="/"
              className="btn-secondary inline-flex min-h-11 items-center px-4"
            >
              Back home
            </AppLink>
          </div>
        </div>
      </EntryScreenLayout>
    );
  }

  return (
    <EntryScreenLayout justify="start" viewport={isDesktop}>
      <ScreenHeader backTo="/" backLabel="Back" />
      <div
        className={`jl-ops-desk ${screenHeaderOffsetClassName}`}
        data-testid="admin-ops-desk"
        data-layout={isDesktop ? "desktop" : "mobile"}
      >
        {isDesktop ? (
          <>
            <AdminDeskTopbar
              openIncidents={openCount}
              inQueue={visibleIncidents.length}
              now={now}
              activePresetId={store.activePresetId}
              userPresets={store.userPresets}
              onSelectPreset={handleSelectPreset}
              onSaveCurrent={handleSaveCurrent}
              onDeleteUserPreset={handleDeleteUserPreset}
              onRefreshSessions={() => void refresh({ background: true })}
              refreshing={refreshing}
            />
            {incidentsError && visibleIncidents.length > 0 ? (
              <InlineError>{incidentsError}</InlineError>
            ) : null}
            <AdminGridWorkspace
              layout={deskLayout}
              bodies={bodies}
              onLayoutChange={(next) => mutateLayout(() => next)}
              onMergePanel={(targetStackId, payload: PanelMergePayload) => {
                mutateLayout((layout) =>
                  mergePanelOntoStack(
                    layout,
                    payload.sourceStackId,
                    payload.panelId,
                    targetStackId,
                  ),
                );
              }}
              onActiveIndexChange={(stackId, activeIndex) => {
                mutateLayout((layout) =>
                  setStackActiveIndex(layout, stackId, activeIndex),
                );
              }}
              onPinToggle={(stackId) => {
                mutateLayout((layout) => {
                  const stack = layout.stacks.find((s) => s.id === stackId);
                  if (!stack) return layout;
                  return setPinned(layout, stackId, !stack.pinned);
                });
              }}
              onCollapseToggle={(stackId) => {
                mutateLayout((layout) => {
                  const stack = layout.stacks.find((s) => s.id === stackId);
                  if (!stack) return layout;
                  return setCollapsed(layout, stackId, !stack.collapsed);
                });
              }}
              onCloseActive={(stackId) => {
                mutateLayout((layout) => {
                  const stack = layout.stacks.find((s) => s.id === stackId);
                  if (!stack) return layout;
                  const panelId =
                    stack.panelIds[stack.activeIndex] ?? stack.panelIds[0];
                  if (!panelId) return layout;
                  return hidePanel(layout, panelId);
                });
              }}
            />
          </>
        ) : (
          <AdminMobileDesk
            activePanelId={mobilePanelId}
            onSelectPanel={(panelId) => {
              persistStore({ ...store, lastMobilePanelId: panelId });
              if (
                (panelId === "detail" ||
                  panelId === "actions" ||
                  panelId === "inbox") &&
                !onIncidentsRoute
              ) {
                void navigate(
                  selectedIncidentId
                    ? `/admin/incidents/${encodeURIComponent(selectedIncidentId)}`
                    : "/admin/incidents",
                );
              }
            }}
            bodies={bodies}
            openIncidents={openCount}
            inQueue={visibleIncidents.length}
            now={now}
            activePresetId={store.activePresetId}
            userPresets={store.userPresets}
            onSelectPreset={handleSelectPreset}
            onSaveCurrent={handleSaveCurrent}
            onDeleteUserPreset={handleDeleteUserPreset}
            onRefreshSessions={() => void refresh({ background: true })}
            refreshing={refreshing}
          />
        )}
      </div>
    </EntryScreenLayout>
  );
}
