import { Link } from "react-router-dom";
import { useCallback, useState } from "react";
import { signOut } from "firebase/auth";
import { PremiumSignInGate } from "../components/billing/PremiumSignInGate";
import { AdminSessionTimer } from "../components/admin/AdminSessionTimer";
import { EntryScreenLayout } from "../components/ui/EntryScreenLayout";
import { HudAdminIcon } from "../components/ui/HudIcons";
import { InlineError } from "../components/ui/InlineError";
import { MotionPressable } from "../components/motion/MotionPressable";
import { isAdminUser } from "../domain/admin/adminAccess";
import { adminSessionPhaseLabel } from "../domain/admin/sessionPhase";
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

function AdminSessionRow({
  summary,
  observingCode,
  onObserve,
}: {
  summary: AdminSessionSummary;
  observingCode: string | null;
  onObserve: (summary: AdminSessionSummary) => void;
}) {
  const busy = observingCode === summary.code;

  return (
    <div className="home-card-btn home-card-btn-secondary items-start gap-3 py-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xl font-bold tracking-[0.22em] text-ink">
            {summary.code}
          </span>
          <span className="rounded-full border border-brand-blue/40 bg-brand-blue/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-blue">
            {adminSessionPhaseLabel(summary.phase)}
          </span>
        </div>
        <AdminSessionTimer summary={summary} />
        <p className="text-sm text-ink-muted">
          {summary.roleCounts.seeker} seeker
          {summary.roleCounts.seeker === 1 ? "" : "s"} · {summary.roleCounts.hider}{" "}
          hider{summary.roleCounts.hider === 1 ? "" : "s"}
          {summary.roleCounts.observer > 0
            ? ` · ${summary.roleCounts.observer} observer`
            : ""}{" "}
          · {summary.tier} · {summary.gameSize}
        </p>
      </div>
      <MotionPressable
        type="button"
        className="btn-primary min-h-11 shrink-0 px-4 disabled:opacity-50"
        disabled={busy}
        aria-busy={busy}
        onClick={() => onObserve(summary)}
      >
        {busy ? "Joining…" : "Observe"}
      </MotionPressable>
    </div>
  );
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
        <AdminSessionSkeletonRows />
      </EntryScreenLayout>
    );
  }

  if (!isPermanent || !user) {
    return (
      <EntryScreenLayout justify="start">
        <div className="space-y-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-ink">
              Live sessions
            </h1>
            <p className="text-sm text-ink-muted">
              Sign in with your Google account to open the admin panel.
            </p>
          </div>
          <PremiumSignInGate continuePath="/admin" />
          <Link to="/" className="btn-secondary inline-flex min-h-11 items-center px-4">
            Back home
          </Link>
        </div>
      </EntryScreenLayout>
    );
  }

  if (!isAdmin) {
    return (
      <EntryScreenLayout justify="start">
        <div className="space-y-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
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
      <div className="space-y-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
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
          <div className="space-y-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {sessions.map((summary) => (
              <AdminSessionRow
                key={summary.sessionId}
                summary={summary}
                observingCode={observingCode}
                onObserve={(nextSummary) => void handleObserve(nextSummary)}
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pb-4 text-xs text-ink-dim">
          <Link to="/" className="underline-offset-2 hover:underline">
            Back home
          </Link>
          <span>v{APP_VERSION}</span>
        </div>
      </div>
    </EntryScreenLayout>
  );
}
