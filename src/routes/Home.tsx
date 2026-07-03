import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LOCAL_SESSION_ID } from "../domain/annotations";
import { useSessionStore } from "../state/sessionStore";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../services/firebase";
import { getRemoteSessionById } from "../services/firestoreAnnotations";

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
        setSession(null);
        setContinueError("That session no longer exists.");
        return;
      }

      if (remoteSession.endedAt) {
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
    <main className="flex min-h-[100dvh] flex-col justify-between bg-surface-deep px-5 py-8">
      <div className="space-y-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <h1 className="text-balance text-3xl font-semibold text-ink sm:text-4xl">
          Jet Lag Map Companion
        </h1>
        <p className="max-w-md text-pretty text-base text-ink-muted">
          Annotate the live search map with radar circles, thermometer arrows,
          zones, and notes.
        </p>
      </div>

      <div className="space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {session ? (
          <button
            type="button"
            onClick={() => void handleContinue()}
            disabled={continuing}
            className="btn-secondary min-h-14 w-full border border-action/40 disabled:opacity-50"
          >
            {continuing
              ? "Checking session…"
              : `Continue session ${session.code}`}
          </button>
        ) : null}
        <Link to="/create" className="btn-primary min-h-14 w-full">
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
