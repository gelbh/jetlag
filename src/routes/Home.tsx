import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { HudPlayIcon } from "../components/ui/HudIcons";
import { LOCAL_SESSION_ID } from "../domain/annotations";
import { useSessionStore } from "../state/sessionStore";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../services/firebase";
import { getRemoteSessionById } from "../services/firestoreAnnotations";
import { clearSessionLocalArtifacts } from "../services/sessionCleanup";

export function Home() {
  const navigate = useNavigate();
  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);
  const [continueError, setContinueError] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);

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

      setSession(remoteSession);
      navigate("/map");
    } catch (error) {
      setContinueError(
        error instanceof Error
          ? error.message
          : "Unable to continue that session.",
      );
    } finally {
      setContinuing(false);
    }
  };

  return (
    <main className="home-terminal home-terminal-accent flex min-h-[100dvh] flex-col justify-between px-5 py-8">
      <div className="space-y-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-dim">
          Field map companion
        </p>
        <h1 className="text-balance text-[clamp(1.875rem,5vw,2.25rem)] font-semibold leading-tight text-ink">
          Jet Lag Map Companion
        </h1>
        <p className="max-w-md text-pretty text-base text-ink-muted">
          Mark the live search map — radar circles, zones, pins, and question
          tools for your team.
        </p>
      </div>

      <div className="space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
            className="btn-primary home-resume-action disabled:opacity-50"
          >
            <span className="home-resume-readout">
              <span className="home-resume-label">Active session</span>
              <span className="home-resume-code">{session.code}</span>
            </span>
            <span
              className="home-resume-divider"
              aria-hidden="true"
            />
            <span className="home-resume-cta">
              {continuing ? (
                "Verifying…"
              ) : (
                <>
                  <HudPlayIcon className="h-4 w-4 shrink-0" />
                  Return to map
                </>
              )}
            </span>
          </button>
        ) : null}
        <Link
          to="/create"
          className={
            session
              ? "btn-secondary min-h-14 w-full border border-border"
              : "btn-primary min-h-14 w-full"
          }
        >
          Create session
        </Link>
        <Link
          to="/join"
          className="btn-secondary min-h-14 w-full border border-border"
        >
          Join session
        </Link>
        {continueError ? <p className="text-error">{continueError}</p> : null}
      </div>
    </main>
  );
}
