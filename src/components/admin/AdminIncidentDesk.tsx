import { signOut } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLink } from "../navigation/AppLink";
import { PremiumSignInGate } from "../billing/PremiumSignInGate";
import { EntryScreenLayout } from "../ui/EntryScreenLayout";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../ui/ScreenHeader";
import { InlineError } from "../ui/InlineError";
import { isAdminUser } from "../../domain/admin/adminAccess";
import { APP_VERSION } from "../../domain/device/changelog";
import type { IncidentRecord } from "../../domain/incident/incidentTypes";
import { usePermanentAuthUser } from "../../hooks/billing/usePermanentAuthUser";
import { useAppNavigate } from "../../hooks/useAppNavigate";
import { useMinWidth } from "../../hooks/useMinWidth";
import { getFirebaseAuth, isFirebaseConfigured } from "../../services/core/firebase";
import {
  countOpenIncidents,
  subscribeIncidentList,
} from "../../services/admin/adminIncidents";
import { AdminIncidentActions } from "./AdminIncidentActions";
import { AdminIncidentDetail } from "./AdminIncidentDetail";
import { AdminIncidentInbox } from "./AdminIncidentInbox";
import "./AdminIncidentDesk.css";

const EMPTY_INCIDENTS: IncidentRecord[] = [];

function formatUtcClock(now: Date): string {
  return now.toISOString().slice(11, 19) + " UTC";
}

export function AdminIncidentDesk() {
  const { incidentId: routeIncidentId } = useParams<{ incidentId?: string }>();
  const navigate = useAppNavigate();
  const { user, isPermanent, authReady } = usePermanentAuthUser();
  const isAdmin = isAdminUser(user);
  const enabled = authReady && isAdmin && isFirebaseConfigured();
  const isDesktop = useMinWidth(1024);

  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [listError, setListError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [enabledState, setEnabledState] = useState(enabled);

  const selectedId = routeIncidentId?.trim() || null;

  if (enabled !== enabledState) {
    setEnabledState(enabled);
    if (enabled) {
      setLoading(true);
      setListError(null);
    }
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const unsubscribe = subscribeIncidentList(
      (next) => {
        setIncidents(next);
        setLoading(false);
      },
      (error) => {
        setListError(error.message);
        setLoading(false);
      },
      { limitCount: 50 },
    );
    return unsubscribe;
  }, [enabled]);

  const visibleIncidents = enabled ? incidents : EMPTY_INCIDENTS;
  const visibleLoading = enabled ? loading : false;
  const visibleListError = enabled ? listError : null;

  const openCount = useMemo(
    () => countOpenIncidents(visibleIncidents),
    [visibleIncidents],
  );

  const handleSelect = (incidentId: string) => {
    void navigate(`/admin/incidents/${encodeURIComponent(incidentId)}`);
  };

  const handleBackToQueue = () => {
    void navigate("/admin/incidents");
  };

  const handleSignOut = async () => {
    await signOut(getFirebaseAuth());
  };

  if (!authReady) {
    return (
      <EntryScreenLayout justify="start" viewport>
        <ScreenHeader backTo="/admin" backLabel="Admin" />
        <div className={screenHeaderOffsetClassName}>
          <div className="jl-incident-empty" aria-busy="true">
            <p className="jl-incident-empty-title">Loading</p>
            <p className="jl-incident-empty-body">Checking admin access…</p>
          </div>
        </div>
      </EntryScreenLayout>
    );
  }

  if (!isPermanent || !user) {
    return (
      <EntryScreenLayout justify="start">
        <ScreenHeader backTo="/admin" backLabel="Admin" />
        <div className={`space-y-4 ${screenHeaderOffsetClassName}`}>
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">
              Incident desk
            </h1>
            <p className="text-sm text-ink-muted">
              Sign in with your Google account to open the incident desk.
            </p>
          </div>
          <PremiumSignInGate
            continuePath={
              selectedId
                ? `/admin/incidents/${encodeURIComponent(selectedId)}`
                : "/admin/incidents"
            }
          />
        </div>
      </EntryScreenLayout>
    );
  }

  if (!isAdmin) {
    return (
      <EntryScreenLayout justify="start">
        <ScreenHeader backTo="/admin" backLabel="Admin" />
        <div className={`space-y-4 ${screenHeaderOffsetClassName}`}>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">
            Access denied
          </h1>
          <p className="text-sm text-ink-muted">
            Signed in as {user.email ?? "unknown"}. The incident desk is
            restricted to the app owner.
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
              to="/admin"
              className="btn-secondary inline-flex min-h-11 items-center px-4"
            >
              Back to admin
            </AppLink>
          </div>
        </div>
      </EntryScreenLayout>
    );
  }

  const showMobileDetail = !isDesktop && selectedId != null;
  const showMobileQueue = !isDesktop && selectedId == null;

  return (
    <EntryScreenLayout justify="start" viewport>
      <ScreenHeader backTo="/admin" backLabel="Admin" />
      <div
        className={`jl-incident-desk ${screenHeaderOffsetClassName}`}
        data-testid="admin-incident-desk"
        data-layout={isDesktop ? "desktop" : "mobile"}
      >
        <header className="jl-incident-topbar">
          <div className="jl-incident-brand">
            <span className="jl-incident-brand-mark">Jetlag</span>
            <span className="jl-incident-brand-title">
              Broadcast HUD // Admin incident desk v{APP_VERSION}
            </span>
          </div>
          <dl className="jl-incident-top-stats">
            <div className="jl-incident-stat">
              <dt>Open incidents</dt>
              <dd>{openCount}</dd>
            </div>
            <div className="jl-incident-stat">
              <dt>In queue</dt>
              <dd>{visibleIncidents.length}</dd>
            </div>
            <div className="jl-incident-stat">
              <dt>Time</dt>
              <dd>{formatUtcClock(now)}</dd>
            </div>
          </dl>
        </header>

        {visibleListError && visibleIncidents.length > 0 ? (
          <InlineError>{visibleListError}</InlineError>
        ) : null}

        {isDesktop ? (
          <div className="jl-incident-panes jl-incident-panes--desktop">
            <div className="jl-incident-pane">
              <AdminIncidentInbox
                incidents={visibleIncidents}
                selectedId={selectedId}
                openCount={openCount}
                loading={visibleLoading}
                error={visibleListError}
                onSelect={handleSelect}
              />
            </div>
            <div className="jl-incident-pane jl-incident-pane--detail">
              <AdminIncidentDetail incidentId={selectedId} />
            </div>
            <div className="jl-incident-pane jl-incident-pane--actions">
              <AdminIncidentActions
                incidentId={selectedId}
                disabled={!selectedId}
              />
            </div>
          </div>
        ) : null}

        {showMobileQueue ? (
          <div className="jl-incident-panes jl-incident-panes--mobile">
            <div className="jl-incident-pane">
              <AdminIncidentInbox
                incidents={visibleIncidents}
                selectedId={selectedId}
                openCount={openCount}
                loading={visibleLoading}
                error={visibleListError}
                onSelect={handleSelect}
              />
            </div>
          </div>
        ) : null}

        {showMobileDetail ? (
          <div
            className="jl-incident-mobile-stack"
            data-testid="admin-incident-mobile-stack"
          >
            <button
              type="button"
              className="btn-secondary jl-incident-mobile-back min-h-10 self-start px-3 text-sm uppercase"
              onClick={handleBackToQueue}
            >
              Back to queue
            </button>
            <div className="jl-incident-pane jl-incident-pane--detail">
              <AdminIncidentDetail incidentId={selectedId} />
            </div>
            <div className="jl-incident-pane jl-incident-pane--actions">
              <AdminIncidentActions incidentId={selectedId} />
            </div>
          </div>
        ) : null}
      </div>
    </EntryScreenLayout>
  );
}
