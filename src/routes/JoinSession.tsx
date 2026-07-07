import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLogo } from "../components/ui/AppLogo";
import { isPremiumSession } from "../domain/map/annotations";
import {
  isValidSessionCode,
  normalizeSessionCode,
} from "../services/session/sessionCodes";
import { useSessionStore } from "../state/sessionStore";
import type { PlayerRole } from "../domain/session/playerRole";
import { RolePicker } from "../components/session/RolePicker";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../services/core/firebase";
import {
  joinRemoteSessionByCode,
  lookupRemoteSessionByCode,
} from "../services/firestore/firestoreAnnotations";
import { retryAsync } from "../services/core/retryAsync";
import { setPremiumApiContext } from "../services/core/premiumApiContext";

export function JoinSession() {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewPremium, setPreviewPremium] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [playerRole, setPlayerRole] = useState<PlayerRole>("hider");

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
        joinRemoteSessionByCode(normalized, user.uid, playerRole),
      );
      if (result.status === "missing") {
        setError("No session found for that code.");
        return;
      }

      if (result.status === "ended") {
        setError("That session has ended. Ask the host for a new code.");
        return;
      }

      setSession(result.session, user.uid);
      setPremiumApiContext(result.session);
      navigate("/map");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Couldn't join that session.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="home-poster home-terminal-accent flex min-h-[100dvh] flex-col justify-center gap-8 overflow-y-auto px-5 py-8 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div>
        <Link
          to="/"
          className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-dim"
        >
          ← Back
        </Link>
        <div className="mt-6">
          <AppLogo variant="lockup" size="md" />
        </div>
        <p className="mt-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
          Join game
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold uppercase leading-none tracking-tight text-ink">
          Session code
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
          Enter the four letters your host shared. Everyone in the session sees
          the same live map.
        </p>
      </div>

      <div className="jl-field-frame space-y-4">
        <label className="field-label font-display text-xs uppercase tracking-[0.12em]">
          Code
          <input
            value={code}
            onChange={(event) =>
              setCode(normalizeSessionCode(event.target.value))
            }
            maxLength={4}
            className="field-input mt-2 min-h-16 border-0 bg-transparent p-0 text-center font-mono text-4xl font-bold tracking-[0.45em] focus:outline-none"
            placeholder="ABCD"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>

        {previewPremium ? (
          <p className="font-display text-xs font-semibold uppercase tracking-wide text-status-info">
            Premium · live transit
          </p>
        ) : null}
        {lookupLoading ? (
          <p className="text-sm text-ink-dim">Checking session…</p>
        ) : null}

        <RolePicker
          value={playerRole}
          onChange={setPlayerRole}
          disabled={loading}
        />

        <button
          type="button"
          onClick={() => void handleJoin()}
          disabled={loading}
          className="btn-primary min-h-14 w-full disabled:opacity-50"
        >
          {loading ? "Joining…" : "Join session"}
        </button>

        {error ? <p className="text-error">{error}</p> : null}
      </div>
    </main>
  );
}
