import { Link } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { PremiumSignInGate } from "../components/billing/PremiumSignInGate";
import { AdminDashboardLayout } from "../components/admin/AdminDashboardLayout";
import { AdminMonitorPane } from "../components/admin/AdminMonitorPane";
import {
  AdminSessionFilters,
} from "../components/admin/AdminSessionFilters";
import { AdminSessionRow } from "../components/admin/AdminSessionRow";
import { AdminSettingsSheet } from "../components/admin/AdminSettingsSheet";
import { AdminStatsHeader } from "../components/admin/AdminStatsHeader";
import { EntryScreenLayout } from "../components/ui/EntryScreenLayout";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../components/ui/ScreenHeader";
import { HudAdminIcon, HudSettingsIcon } from "../components/ui/HudIcons";
import { InlineError } from "../components/ui/InlineError";
import { isAdminUser } from "../domain/admin/adminAccess";
import { filterAdminSessions } from "../domain/admin/adminSessionFilters";
import type { AdminSessionPhaseFilter } from "../domain/admin/adminSessionFilters";
import { useAdminPanelPreferences } from "../domain/admin/adminPanelPreferences";
import { APP_VERSION } from "../domain/device/changelog";
import { useAdminJoinSession } from "../hooks/admin/useAdminJoinSession";
import { useAdminSessionList } from "../hooks/admin/useAdminSessionList";
import { useMinWidth } from "../hooks/useMinWidth";
import { usePermanentAuthUser } from "../hooks/billing/usePermanentAuthUser";
import { getFirebaseAuth } from "../services/core/firebase";
import { useSessionStore } from "../state/sessionStore";
import type { AdminSessionSummary } from "../services/admin/adminSessions";

function formatLastFetched(at: Date | null): string {
  if (!at) {
    return "Not refreshed yet";
  }

  return `Updated ${at.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

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

export function AdminPanel() {
  const { user, isPermanent, authReady } = usePermanentAuthUser();
  const isAdmin = isAdminUser(user);
  const enabled = authReady && isAdmin;
  const isDesktop = useMinWidth(1024);
  const activeSession = useSessionStore((state) => state.session);
  const activeRole = useSessionStore((state) => state.myRole);
  const { sessions, loading, refreshing, error, lastFetchedAt, refresh } =
    useAdminSessionList(enabled);
  const {
    joinSession,
    joiningCode: observingCode,
    error: observeError,
    setError: setObserveError,
  } = useAdminJoinSession({ onRefresh: refresh });
  const pollIntervalMs = useAdminPanelPreferences((state) => state.pollIntervalMs);
  const multiplayerOnly = useAdminPanelPreferences((state) => state.multiplayerOnly);
  const setPollIntervalMs = useAdminPanelPreferences(
    (state) => state.setPollIntervalMs,
  );
  const setMultiplayerOnly = useAdminPanelPreferences(
    (state) => state.setMultiplayerOnly,
  );
  const [query, setQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<AdminSessionPhaseFilter>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [monitorSessionId, setMonitorSessionId] = useState<string | null>(null);

  const filteredSessions = useMemo(
    () =>
      filterAdminSessions(sessions, {
        query,
        phase: phaseFilter,
        multiplayerOnly,
      }),
    [multiplayerOnly, phaseFilter, query, sessions],
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

  const handleSignOut = async () => {
    await signOut(getFirebaseAuth());
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
              Live sessions
            </h1>
            <p className="text-sm text-ink-muted">
              Sign in with your Google account to open the admin panel.
            </p>
          </div>
          <PremiumSignInGate continuePath="/admin" />
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
            <Link to="/" className="btn-secondary inline-flex min-h-11 items-center px-4">
              Back home
            </Link>
          </div>
        </div>
      </EntryScreenLayout>
    );
  }

  const sessionList = (
    <div className="space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <AdminSessionFilters
        query={query}
        phase={phaseFilter}
        multiplayerOnly={multiplayerOnly}
        onQueryChange={setQuery}
        onPhaseChange={setPhaseFilter}
        onMultiplayerOnlyChange={setMultiplayerOnly}
      />
      {filteredSessions.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-panel px-4 py-6">
          <p className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
            No matching sessions
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            Try another code, area name, or phase filter.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredSessions.map((summary) => (
            <AdminSessionRow
              key={summary.sessionId}
              summary={summary}
              observingCode={observingCode}
              selected={selectedSessionId === summary.sessionId}
              onMonitor={(nextSummary) => void handleMonitor(nextSummary)}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <EntryScreenLayout justify="start">
      <AdminSettingsSheet
        open={settingsOpen}
        pollIntervalMs={pollIntervalMs}
        multiplayerOnly={multiplayerOnly}
        onPollIntervalChange={setPollIntervalMs}
        onMultiplayerOnlyChange={setMultiplayerOnly}
        onClose={() => setSettingsOpen(false)}
      />
      <ScreenHeader backTo="/" backLabel="Back" />
      <div className={`space-y-4 ${screenHeaderOffsetClassName}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-brand-blue">
              <HudAdminIcon className="size-5" aria-hidden="true" />
              <p className="font-display text-sm font-semibold uppercase tracking-wide">
                Admin
              </p>
            </div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">
              Live sessions
            </h1>
            <p className="text-sm text-ink-muted">
              {formatLastFetched(lastFetchedAt)}
              {refreshing ? " · Refreshing…" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hud-chrome inline-flex min-h-11 min-w-11 items-center justify-center"
              aria-label="Panel settings"
              onClick={() => setSettingsOpen(true)}
            >
              <HudSettingsIcon className="size-5" />
            </button>
            <button
              type="button"
              className="hud-chrome inline-flex min-h-11 items-center justify-center px-3 text-sm font-semibold uppercase tracking-wide text-ink"
              onClick={() => void refresh()}
              aria-label="Refresh live sessions"
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? <InlineError>{error}</InlineError> : null}
        {observeError ? <InlineError>{observeError}</InlineError> : null}

        {loading ? (
          <AdminSessionSkeletonRows />
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-panel px-4 py-6">
            <p className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
              No live sessions
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              Games appear here while a host session is active.
            </p>
          </div>
        ) : (
          <>
            <AdminStatsHeader sessions={sessions} />
            <AdminDashboardLayout
              showMonitor={isDesktop}
              list={sessionList}
              monitor={
                <AdminMonitorPane
                  active={monitorActive}
                  sessionCode={activeSession?.code ?? null}
                  errorMessage={monitorRoleError}
                />
              }
            />
          </>
        )}

        <div className="pb-4 text-xs text-ink-dim">
          <span>v{APP_VERSION}</span>
        </div>
      </div>
    </EntryScreenLayout>
  );
}
