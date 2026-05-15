import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  isValidSessionCode,
  normalizeSessionCode,
} from "../services/sessionCodes";
import { useSessionStore } from "../state/sessionStore";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../services/firebase";
import { joinRemoteSessionByCode } from "../services/firestoreAnnotations";

export function JoinSession() {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const normalized = normalizeSessionCode(code);
    if (!isValidSessionCode(normalized)) {
      setError("Enter a 4-letter session code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!isFirebaseConfigured()) {
        setError("Firebase is not configured. Create a local session instead.");
        return;
      }

      const user = await ensureAnonymousUser();
      const result = await joinRemoteSessionByCode(normalized, user.uid);
      if (result.status === "missing") {
        setError("No session found for that code.");
        return;
      }

      if (result.status === "ended") {
        setError("That session has ended. Ask the host for a new code.");
        return;
      }

      setSession(result.session);
      navigate("/map");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to join session.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-full flex-col justify-center gap-6 bg-slate-950 px-5 py-8">
      <div>
        <Link to="/" className="text-sm text-slate-400">
          Back
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">Join session</h1>
        <p className="mt-2 text-sm text-slate-300">
          Enter the 4-letter code from the host.
        </p>
      </div>

      <input
        value={code}
        onChange={(event) => setCode(normalizeSessionCode(event.target.value))}
        maxLength={4}
        className="min-h-14 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-center text-2xl tracking-[0.5em]"
        placeholder="ABCD"
        autoCapitalize="characters"
      />

      <button
        type="button"
        onClick={() => void handleJoin()}
        disabled={loading}
        className="min-h-14 rounded-2xl bg-sky-500 text-base font-semibold text-slate-950 disabled:opacity-50"
      >
        {loading ? "Joining…" : "Join session"}
      </button>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </main>
  );
}
