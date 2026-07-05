import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isPremiumSession } from "../domain/annotations";
import {
  isValidSessionCode,
  normalizeSessionCode,
} from "../services/sessionCodes";
import { useSessionStore } from "../state/sessionStore";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../services/firebase";
import {
  joinRemoteSessionByCode,
  lookupRemoteSessionByCode,
} from "../services/firestoreAnnotations";
import { retryAsync } from "../services/retryAsync";
import { setPremiumApiContext } from "../services/premiumApiContext";

export function JoinSession() {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewPremium, setPreviewPremium] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    const normalized = normalizeSessionCode(code);
    if (!isValidSessionCode(normalized)) {
      /* eslint-disable react-hooks/set-state-in-effect -- clear stale preview when code changes */
      setPreviewPremium(false);
      setLookupLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    let cancelled = false;
    setLookupLoading(true);

    void (async () => {
      try {
        const result = await retryAsync(() =>
          lookupRemoteSessionByCode(normalized),
        );
        if (cancelled) {
          return;
        }

        setPreviewPremium(
          result.status === "found" && isPremiumSession(result.session),
        );
        if (result.status === "missing") {
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setPreviewPremium(false);
        }
      } finally {
        if (!cancelled) {
          setLookupLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

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

      const user = await retryAsync(() => ensureAnonymousUser());
      const result = await retryAsync(() =>
        joinRemoteSessionByCode(normalized, user.uid),
      );
      if (result.status === "missing") {
        setError("No session found for that code.");
        return;
      }

      if (result.status === "ended") {
        setError("That session has ended. Ask the host for a new code.");
        return;
      }

      setSession(result.session);
      setPremiumApiContext(result.session);
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
    <main className="flex min-h-full flex-col justify-center gap-6 bg-surface-deep px-5 py-8">
      <div>
        <Link to="/" className="text-sm text-ink-dim">
          Back
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-ink">Join session</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Enter the 4-letter code from the host.
        </p>
      </div>

      <input
        value={code}
        onChange={(event) => setCode(normalizeSessionCode(event.target.value))}
        maxLength={4}
        className="field-input min-h-14 rounded-[var(--radius-hud-lg)] text-center text-2xl tracking-[0.5em]"
        placeholder="ABCD"
        autoCapitalize="characters"
      />

      {previewPremium ? (
        <p className="font-mono text-sm text-status-info">
          Premium · live transit enabled
        </p>
      ) : null}
      {lookupLoading ? (
        <p className="text-sm text-ink-dim">Checking session…</p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleJoin()}
        disabled={loading}
        className="btn-primary min-h-14 disabled:opacity-50"
      >
        {loading ? "Joining…" : "Join session"}
      </button>

      {error ? <p className="text-error">{error}</p> : null}
    </main>
  );
}
