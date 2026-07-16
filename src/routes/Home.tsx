import { AppLink } from "../components/navigation/AppLink";
import { useState } from "react";
import { AppLogo } from "../components/ui/AppLogo";
import { BootSplash } from "../components/ui/BootSplash";
import { EntryScreenLayout } from "../components/ui/EntryScreenLayout";
import {
  HudGuideIcon,
  HudPlayIcon,
  HudAdminIcon,
  HudFriendsIcon,
  HudLeaderboardIcon,
} from "../components/ui/HudIcons";
import { InlineError } from "../components/ui/InlineError";
import { VersionChangelogSheet } from "../components/ui/VersionChangelogSheet";
import { MotionPressable } from "../components/motion/MotionPressable";
import { PlayHubSheet } from "../components/home/PlayHubSheet";
import { APP_VERSION } from "../domain/device/changelog";
import { LOCAL_SESSION_ID } from "../domain/map/annotations";
import { playerRoleLabel, resolvePlayerRole } from "../domain/session/playerRole";
import { useSessionStore } from "../state/sessionStore";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../services/core/firebase";
import {
  getRemoteSessionById,
  healSessionMembership,
  lookupRemoteSessionByCode,
} from "../services/firestore/sessionMembershipHeal";
import { isFirestorePermissionDenied } from "../services/firestore/firestoreAnnotations";
import { useSessionExit } from "../hooks/session/useSessionExit";
import { setPremiumApiContext } from "../services/core/premiumApiContext";
import { useAppNavigate } from "../hooks/useAppNavigate";
import { useRouteTransition } from "../navigation/useRouteTransition";
import { usePremiumEntitlements } from "../hooks/billing/usePremiumEntitlements";
import { resolveHomePremiumButtonDisplay } from "../domain/billing/premiumProducts";
import { useAuthBootstrapReady } from "../hooks/useAuthBootstrapReady";
import { LEGAL_APP_NAME } from "../domain/legal/legalContact";
import { isAdminUser } from "../domain/admin/adminAccess";
import { usePermanentAuthUser } from "../hooks/billing/usePermanentAuthUser";
import { useUserProfile } from "../hooks/profile/useUserProfile";

export function Home() {
  const navigate = useAppNavigate();
  const exitSession = useSessionExit();
  const session = useSessionStore((state) => state.session);
  const myRole = useSessionStore((state) => state.myRole);
  const myUid = useSessionStore((state) => state.myUid);
  const setSession = useSessionStore((state) => state.setSession);
  const [continueError, setContinueError] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [playHubOpen, setPlayHubOpen] = useState(false);
  const { entitlements: premiumEntitlements } = usePremiumEntitlements();
  const { user: permanentUser, isPermanent } = usePermanentAuthUser();
  const showAdminEntry = isAdminUser(permanentUser);
  const authBootstrapReady = useAuthBootstrapReady();
  const { phase: routeTransitionPhase } = useRouteTransition();
  const { profile, ready: profileReady, error: profileError } = useUserProfile(
    permanentUser?.uid,
    isFirebaseConfigured() && isPermanent && permanentUser != null,
  );
  const showUsernamePrompt =
    isPermanent && profileReady && profileError == null && profile == null;
  const premiumButton = resolveHomePremiumButtonDisplay(premiumEntitlements);

  if (
    isFirebaseConfigured() &&
    !authBootstrapReady &&
    routeTransitionPhase === "idle"
  ) {
    return <BootSplash label="Starting…" />;
  }

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
      let remoteSession = null;
      try {
        remoteSession = await getRemoteSessionById(session.id);
      } catch (error) {
        if (!isFirestorePermissionDenied(error)) {
          throw error;
        }
      }

      if (!remoteSession) {
        const lookup = await lookupRemoteSessionByCode(session.code);
        if (lookup.status === "missing") {
          await exitSession({
            reason: "reset",
            sessionId: session.id,
            animate: false,
          });
          setContinueError("That session no longer exists.");
          return;
        }
        if (lookup.status === "ended") {
          await exitSession({
            reason: "reset",
            sessionId: session.id,
            animate: false,
          });
          setContinueError("That session has ended. Join or create a new one.");
          return;
        }
        remoteSession = lookup.session;
      }

      if (remoteSession.endedAt) {
        await exitSession({
          reason: "reset",
          sessionId: session.id,
          animate: false,
        });
        setContinueError("That session has ended. Join or create a new one.");
        return;
      }

      const resumeRole =
        myRole ?? resolvePlayerRole(remoteSession.memberRoles, myUid ?? user.uid);
      const activeSession = await healSessionMembership(
        remoteSession,
        user.uid,
        resumeRole,
        { returningMemberUid: myUid, persistedMyUid: myUid },
      );

      const role = resolvePlayerRole(activeSession.memberRoles, user.uid);
      if (
        myRole &&
        activeSession.memberRoles &&
        activeSession.memberRoles[user.uid] &&
        myRole !== role
      ) {
        setContinueError("Your role changed for this session. Rejoin with a new code.");
        return;
      }

      setSession(activeSession, user.uid);
      setPremiumApiContext(activeSession);
      navigate("/map");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Couldn't continue that session.";
      if (
        message === "That session no longer exists." ||
        message === "That session has ended. Join or create a new one."
      ) {
        await exitSession({
          reason: "reset",
          sessionId: session.id,
          animate: false,
        });
      }
      setContinueError(message);
    } finally {
      setContinuing(false);
    }
  };

  return (
    <>
      <EntryScreenLayout viewport viewportLayout="center">
        <div className="flex w-full flex-col gap-6">
          <div className="shrink-0 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <AppLogo variant="mark" size="lg" className="shrink-0" />
              <div className="flex shrink-0 items-center gap-2">
                {showAdminEntry ? (
                  <AppLink
                    to="/admin"
                    className="hud-chrome inline-flex size-[2.75rem] items-center justify-center text-ink-muted"
                    aria-label="Admin — live sessions"
                  >
                    <HudAdminIcon className="size-5" />
                  </AppLink>
                ) : null}
                <AppLink
                  to="/tutorial"
                  className="hud-chrome inline-flex size-[2.75rem] items-center justify-center text-ink-muted"
                  aria-label="Open tutorial"
                >
                  <HudGuideIcon className="size-5" />
                </AppLink>
                <AppLink
                  to="/friends"
                  className="hud-chrome inline-flex size-[2.75rem] items-center justify-center text-ink-muted"
                  aria-label="Friends"
                >
                  <HudFriendsIcon className="size-5" />
                </AppLink>
                <AppLink
                  to="/leaderboard"
                  className="hud-chrome inline-flex size-[2.75rem] items-center justify-center text-ink-muted"
                  aria-label="Leaderboard"
                >
                  <HudLeaderboardIcon className="size-5" />
                </AppLink>
                <MotionPressable
                  type="button"
                  onClick={() => setChangelogOpen(true)}
                  className="hud-chrome shrink-0 px-2.5 py-1.5 font-mono text-xs font-bold tracking-wide text-ink-muted"
                  aria-label={`Version ${APP_VERSION}. Open changelog`}
                >
                  v{APP_VERSION}
                </MotionPressable>
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="font-display text-balance text-[clamp(1.75rem,7.5vw,3rem)] font-bold uppercase leading-[0.95] tracking-tight text-ink">
                {LEGAL_APP_NAME}
              </h1>
              <p className="font-display text-pretty text-[clamp(1.5rem,6vw,2.25rem)] font-bold uppercase leading-none tracking-tight text-brand-blue">
                Hide + Seek
              </p>
            </div>
            <p className="max-w-sm text-pretty text-base leading-relaxed text-ink-muted">
              Unofficial fan companion for Jet Lag: The Game. Host or join synced map
              sessions: seekers ask questions on the live map, hiders answer and set
              hiding zones, and everyone stays on the same board.
            </p>
            {showUsernamePrompt ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-border pt-3">
                <p className="text-sm text-ink-muted">
                  Choose a username for friends and leaderboards.
                </p>
                <AppLink
                  to="/friends"
                  className="home-feedback-link min-h-11 px-2 font-display text-xs font-semibold uppercase tracking-[0.08em]"
                >
                  Set username
                </AppLink>
              </div>
            ) : null}
          </div>

          <div className="home-enter-actions space-y-2.5">
          {session ? (
            <MotionPressable
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
            </MotionPressable>
          ) : null}
          <MotionPressable
            type="button"
            onClick={() => setPlayHubOpen(true)}
            aria-label="Play — create, join, or custom game"
            aria-haspopup="dialog"
            aria-expanded={playHubOpen}
            className={
              session
                ? "home-card-btn home-card-btn-secondary"
                : "home-card-btn home-card-btn-primary"
            }
          >
            <span>Play</span>
            <span className="home-card-btn-hint">Create, join, or custom</span>
          </MotionPressable>
          {isFirebaseConfigured() ? (
            <AppLink
              to="/premium"
              aria-label={
                premiumButton.planLabel
                  ? `Premium, ${premiumButton.planLabel}. ${premiumButton.detailLabel}`
                  : `Premium sessions and subscriptions. ${premiumButton.detailLabel}`
              }
              className={
                premiumButton.variant === "unlimited"
                  ? "home-card-btn home-card-btn-premium"
                  : premiumButton.variant === "sessions"
                    ? "home-card-btn home-card-btn-premium-sessions"
                    : "home-card-btn home-card-btn-secondary"
              }
            >
              <span className="home-card-btn-text">
                <span>{premiumButton.primaryLabel}</span>
                {premiumButton.planLabel ? (
                  <span className="home-card-btn-plan">{premiumButton.planLabel}</span>
                ) : null}
              </span>
              <span className="home-card-btn-hint">{premiumButton.detailLabel}</span>
            </AppLink>
          ) : null}
          <nav
            aria-label="Legal and feedback"
            className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1"
          >
            <AppLink
              to="/privacy"
              aria-label="Privacy Policy"
              className="home-feedback-link !mt-0 !inline !px-1"
            >
              Privacy
            </AppLink>
            <span className="text-ink-dim" aria-hidden="true">
              ·
            </span>
            <AppLink
              to="/terms"
              aria-label="Terms of Service"
              className="home-feedback-link !mt-0 !inline !px-1"
            >
              Terms
            </AppLink>
            <span className="text-ink-dim" aria-hidden="true">
              ·
            </span>
            <AppLink
              to="/feedback"
              aria-label="Feedback and suggestions"
              className="home-feedback-link !mt-0 !inline !px-1"
            >
              Feedback
            </AppLink>
          </nav>
          {continueError ? <InlineError>{continueError}</InlineError> : null}
          </div>
        </div>
      </EntryScreenLayout>

      <VersionChangelogSheet
        open={changelogOpen}
        onClose={() => setChangelogOpen(false)}
      />
      <PlayHubSheet
        open={playHubOpen}
        onClose={() => setPlayHubOpen(false)}
      />
    </>
  );
}
