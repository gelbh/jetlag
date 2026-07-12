import { Link } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { PremiumSignInGate } from "../components/billing/PremiumSignInGate";
import {
  AdminSessionFilters,
  type AdminSessionPhaseFilter,
} from "../components/admin/AdminSessionFilters";
import { AdminSessionRow } from "../components/admin/AdminSessionRow";
import { EntryScreenLayout } from "../components/ui/EntryScreenLayout";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../components/ui/ScreenHeader";
import { HudAdminIcon } from "../components/ui/HudIcons";
import { InlineError } from "../components/ui/InlineError";
import { isAdminUser } from "../domain/admin/adminAccess";
import { resolveAdminSessionAreaLabel } from "../domain/admin/adminSessionAreaLabel";
import { APP_VERSION } from "../domain/device/changelog";
import { useAdminSessionList } from "../hooks/admin/useAdminSessionList";
import { usePermanentAuthUser } from "../hooks/billing/usePermanentAuthUser";
import { useAppNavigate } from "../hooks/useAppNavigate";
import { getFirebaseAuth } from "../services/core/firebase";
import { joinRemoteSessionByCode } from "../services/firestore/firestoreAnnotations";
import { setPremiumApiContext } from "../services/core/premiumApiContext";
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
  const navigate = useAppNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const { user, isPermanent, authReady } = usePermanentAuthUser();
  const isAdmin = isAdminUser(user);
  const enabled = authReady && isAdmin;
  const { sessions, loading, refreshing, error, lastFetchedAt, refresh } =
    useAdminSessionList(enabled);
  const [observeError, setObserveError] = useState<string | null>(null);
  const [observingCode, setObservingCode] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<AdminSessionPhaseFilter>("all");

  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sessions.filter((summary) => {
      if (phaseFilter !== "all" && summary.phase !== phaseFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const areaLabel = resolveAdminSessionAreaLabel(summary)?.toLowerCase() ?? "";
      return (
        summary.code.toLowerCase().includes(normalizedQuery) ||
        areaLabel.includes(normalizedQuery)
      );
    });
  }, [phaseFilter, query, sessions]);

  const handleObserve = useCallback(
    async (summary: AdminSessionSummary) => {
      if (!user) {
        return;
      }

      setObservingCode(summary.code);
      setObserveError(null);

      try {
        const result = await joinRemoteSessionByCode(
          summary.code,
          user.uid,
          "observer",
        );

        if (result.status === "missing") {
          setObserveError("That session is no longer available.");
          void refresh({ background: true });
          return;
        }

        if (result.status === "ended") {
          setObserveError("That session has ended.");
          void refresh({ background: true });
          return;
        }

        if (result.status === "incompatible") {
          setObserveError("Your app version is older than the host's.");
          return;
        }

        setSession(result.session, user.uid);
        setPremiumApiContext(result.session);
        navigate("/map");
      } catch (joinError) {
        setObserveError(
          joinError instanceof Error
            ? joinError.message
            : "Couldn't join as observer.",
        );
      } finally {
        setObservingCode(null);
      }
    },
    [navigate, refresh, setSession, user],
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

  return (
    <EntryScreenLayout justify="start">
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
          <button
            type="button"
            className="hud-chrome inline-flex min-h-11 min-w-11 items-center justify-center px-3 text-sm font-semibold uppercase tracking-wide text-ink"
            onClick={() => void refresh()}
            aria-label="Refresh live sessions"
          >
            Refresh
          </button>
        </div>

        {error ? (
          <InlineError>{error}</InlineError>
        ) : null}
        {observeError ? (
          <InlineError>{observeError}</InlineError>
        ) : null}

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
          <div className="space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <AdminSessionFilters
              query={query}
              phase={phaseFilter}
              onQueryChange={setQuery}
              onPhaseChange={setPhaseFilter}
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
                    onObserve={(nextSummary) => void handleObserve(nextSummary)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="pb-4 text-xs text-ink-dim">
          <span>v{APP_VERSION}</span>
        </div>
      </div>
    </EntryScreenLayout>
  );
}
