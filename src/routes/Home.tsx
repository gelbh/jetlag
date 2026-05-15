import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
    <main className="flex min-h-[100dvh] flex-col justify-between bg-slate-950 px-5 py-8">
      <div className="space-y-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-sm uppercase tracking-[0.25em] text-sky-300">
          Jet Lag
        </p>
        <h1 className="text-3xl font-semibold text-slate-50 sm:text-4xl">
          Map Companion
        </h1>
        <p className="max-w-md text-base text-slate-300">
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
            className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-sky-400/40 bg-slate-900 text-base font-semibold text-sky-200 disabled:opacity-50"
          >
            {continuing
              ? "Checking session…"
              : `Continue session ${session.code}`}
          </button>
        ) : null}
        <Link
          to="/create"
          className="flex min-h-14 items-center justify-center rounded-2xl bg-sky-500 text-base font-semibold text-slate-950"
        >
          Create session
        </Link>
        <Link
          to="/join"
          className="flex min-h-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-base font-semibold text-slate-100"
        >
          Join session
        </Link>
        {continueError ? (
          <p className="text-sm text-rose-300">{continueError}</p>
        ) : null}
      </div>
    </main>
  );
}
