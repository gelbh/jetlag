import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { AppLogo } from "../components/ui/AppLogo";
import { EntryScreenLayout } from "../components/ui/EntryScreenLayout";
import { HudPlayIcon } from "../components/ui/HudIcons";
import { InlineError } from "../components/ui/InlineError";
import { VersionChangelogSheet } from "../components/ui/VersionChangelogSheet";
import { APP_VERSION } from "../domain/device/changelog";
import { LOCAL_SESSION_ID } from "../domain/map/annotations";
import { playerRoleLabel, resolvePlayerRole } from "../domain/session/playerRole";
import { useSessionStore } from "../state/sessionStore";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../services/core/firebase";
import { getRemoteSessionById } from "../services/firestore/firestoreAnnotations";
import { clearSessionLocalArtifacts } from "../services/session/sessionCleanup";
import { setPremiumApiContext } from "../services/core/premiumApiContext";
import { useViewTransitionNavigate } from "../hooks/useViewTransitionNavigate";
import {
  formatEntitlementSummary,
  type PremiumEntitlements,
} from "../domain/billing/premiumProducts";
import { fetchPremiumEntitlements } from "../services/billing/premiumBilling";

export function Home() {
  const navigate = useViewTransitionNavigate();
  const session = useSessionStore((state) => state.session);
  const myRole = useSessionStore((state) => state.myRole);
  const setSession = useSessionStore((state) => state.setSession);
  const [continueError, setContinueError] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [premiumEntitlements, setPremiumEntitlements] =
    useState<PremiumEntitlements | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!isFirebaseConfigured()) {
        return;
      }

      try {
        await ensureAnonymousUser();
        const next = await fetchPremiumEntitlements();
        if (!cancelled) {
          setPremiumEntitlements(next);
        }
      } catch {
        if (!cancelled) {
          setPremiumEntitlements(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const premiumSummary = formatEntitlementSummary(premiumEntitlements);

  const handleContinue = async () => {
    if (!session) {
      return;
    }

    setContinueError(null);
    setContinuing(true);

    try {
      if (!isFirebaseConfigured() || session.id === LOCAL_SESSION_ID) {
        navigate("/map");
        return;
      }

      const user = await ensureAnonymousUser();
      const remoteSession = await getRemoteSessionById(session.id);
      if (!remoteSession) {
        await clearSessionLocalArtifacts(session.id);
        setSession(null);
        setContinueError("That session no longer exists.");
        return;
      }

      if (remoteSession.endedAt) {
        await clearSessionLocalArtifacts(session.id);
        setSession(null);
        setContinueError("That session has ended. Join or create a new one.");
        return;
      }

      if (!remoteSession.memberUids?.includes(user.uid)) {
        setContinueError("You are no longer a member of that session.");
        return;
      }

      const role = resolvePlayerRole(remoteSession.memberRoles, user.uid);
      if (
        myRole &&
        remoteSession.memberRoles &&
        remoteSession.memberRoles[user.uid] &&
        myRole !== role
      ) {
        setContinueError("Your role changed for this session. Rejoin with a new code.");
        return;
      }

      setSession(remoteSession, user.uid);
      setPremiumApiContext(remoteSession);
      navigate("/map");
    } catch (error) {
      setContinueError(
        error instanceof Error
          ? error.message
          : "Couldn't continue that session.",
      );
    } finally {
      setContinuing(false);
    }
  };

  return (
    <>
      <EntryScreenLayout>
        <div className="space-y-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="flex items-start justify-between gap-3">
            <AppLogo variant="lockup" size="lg" />
            <button
              type="button"
              onClick={() => setChangelogOpen(true)}
              className="hud-chrome shrink-0 px-2.5 py-1.5 font-mono text-xs font-bold tracking-wide text-ink-muted"
              aria-label={`Version ${APP_VERSION}. Open changelog`}
            >
              v{APP_VERSION}
            </button>
          </div>
          <h1 className="font-display text-balance text-[clamp(2.25rem,12vw,4.25rem)] font-bold uppercase leading-[0.92] tracking-tight text-ink">
            Hide +
            <br />
            Seek
          </h1>
          <p className="max-w-sm pt-2 text-pretty text-base leading-relaxed text-ink-muted">
            Seekers ask questions on the live map. Hiders answer, set hiding zones,
            and watch the search unfold.
          </p>
        </div>

        <div className="home-enter-actions mt-8 space-y-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {session ? (
            <button
              type="button"
              onClick={() => void handleContinue()}
              disabled={continuing}
              aria-busy={continuing}
              aria-label={
                continuing
                  ? `Verifying session ${session.code}`
                  : `Return to map for session ${session.code}`
              }
              className="home-card-btn home-card-btn-primary disabled:opacity-50"
            >
              <span>
                <span className="home-card-btn-hint block">
                  Active session
                  {myRole ? ` · ${playerRoleLabel(myRole)}` : ""}
                </span>
                <span className="font-mono text-xl font-bold tracking-[0.22em] jl-view-transition-session-code">
                  {session.code}
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                {continuing ? (
                  "Verifying…"
                ) : (
                  <>
                    <HudPlayIcon className="h-4 w-4" />
                    Map
                  </>
                )}
              </span>
            </button>
          ) : null}
          <Link
            to="/create"
            aria-label="Create session"
            className={
              session
                ? "home-card-btn home-card-btn-secondary"
                : "home-card-btn home-card-btn-primary"
            }
          >
            <span>Create session</span>
            <span className="home-card-btn-hint">Host a game</span>
          </Link>
          <Link to="/join" aria-label="Join session" className="home-card-btn home-card-btn-secondary">
            <span>Join session</span>
            <span className="home-card-btn-hint">Enter 4-letter code</span>
          </Link>
          <Link
            to="/presets"
            aria-label="Custom game presets"
            className="home-card-btn home-card-btn-secondary"
          >
            <span>Custom game</span>
            <span className="home-card-btn-hint">Saved templates</span>
          </Link>
          {isFirebaseConfigured() ? (
            <Link
              to="/premium"
              aria-label="Premium sessions and subscriptions"
              className="home-card-btn home-card-btn-secondary"
            >
              <span>Premium</span>
              <span className="home-card-btn-hint">
                {premiumSummary ?? "Live transit hosting"}
              </span>
            </Link>
          ) : null}
          <Link
            to="/feedback"
            aria-label="Feedback and suggestions"
            className="home-feedback-link"
          >
            Feedback
          </Link>
          {continueError ? <InlineError>{continueError}</InlineError> : null}
        </div>
      </EntryScreenLayout>

      <VersionChangelogSheet
        open={changelogOpen}
        onClose={() => setChangelogOpen(false)}
      />
    </>
  );
}
