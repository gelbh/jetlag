import { useCallback, useEffect, useState, type ReactNode } from "react";
import { isSignInWithEmailLink } from "firebase/auth";
import { LegalInlineLinks } from "../legal/LegalInlineLinks";
import { InlineError } from "../ui/InlineError";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { AppleSignInButton } from "./AppleSignInButton";
import {
  APPLE_SIGN_IN_ENABLED,
  completeOAuthRedirectIfPending,
  completePremiumEmailSignInLink,
  isPermanentUser,
  sendPremiumEmailSignInLink,
} from "../../services/core/accountAuth";
import {
  ensureAnonymousUser,
  getFirebaseAuth,
  isFirebaseConfigured,
} from "../../services/core/firebase";
import { recoverPremiumEntitlements } from "../../services/billing/premiumBilling";
import { usePermanentAuthUser } from "../../hooks/billing/usePermanentAuthUser";

interface PremiumSignInGateProps {
  children?: ReactNode;
  continuePath?: string;
  onSignedIn?: () => void;
}

export function PremiumSignInGate({
  children,
  continuePath = "/premium",
  onSignedIn,
}: PremiumSignInGateProps) {
  const { user, isPermanent, authReady } = usePermanentAuthUser();
  const [email, setEmail] = useState("");
  const [busyAction, setBusyAction] = useState<"email" | null>(null);
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryNote, setRecoveryNote] = useState<string | null>(null);
  const [completingEmailLink, setCompletingEmailLink] = useState(false);

  const handleSignedIn = useCallback(async () => {
    setError(null);
    setRecoveryNote(null);

    try {
      const recovered = await recoverPremiumEntitlements();
      if (recovered) {
        setRecoveryNote(
          "Premium credits from a previous device or account were moved to this sign-in.",
        );
      }
    } catch {
      setError("Couldn't restore purchases. Try again from Premium.");
    }

    onSignedIn?.();
  }, [onSignedIn]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await ensureAnonymousUser();
        const finishingEmailLink =
          isFirebaseConfigured() &&
          isSignInWithEmailLink(getFirebaseAuth(), window.location.href);
        if (finishingEmailLink && !cancelled) {
          setCompletingEmailLink(true);
        }
        const completed = await completePremiumEmailSignInLink();
        if (!cancelled && completed && isPermanentUser(completed)) {
          await handleSignedIn();
          return;
        }

        const oauthCompleted = await completeOAuthRedirectIfPending();
        if (!cancelled && oauthCompleted && isPermanentUser(oauthCompleted)) {
          await handleSignedIn();
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Could not complete email sign-in.",
          );
        }
      } finally {
        if (!cancelled) {
          setCompletingEmailLink(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [handleSignedIn]);

  const handleOAuthSignedIn = useCallback(async () => {
    await handleSignedIn();
  }, [handleSignedIn]);

  const handleEmailLink = async () => {
    setBusyAction("email");
    setError(null);
    setRecoveryNote(null);

    try {
      await ensureAnonymousUser();
      await sendPremiumEmailSignInLink(email, continuePath);
      setEmailLinkSent(true);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not send sign-in link.",
      );
    } finally {
      setBusyAction(null);
    }
  };

  if (!authReady) {
    return (
      <p className="text-sm text-ink-muted">Checking sign-in…</p>
    );
  }

  if (completingEmailLink && !user) {
    return (
      <p className="text-sm text-ink-muted">Checking sign-in link…</p>
    );
  }

  if (isPermanent) {
    return children ? <>{children}</> : null;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-ink-muted">
        Sign in with Google{APPLE_SIGN_IN_ENABLED ? ", Apple" : ""}, or email so
        premium purchases and session credits follow your account across
        devices.
      </p>

      <div className="oauth-sign-in-stack space-y-2">
        <GoogleSignInButton
          disabled={busyAction !== null}
          onSuccess={handleOAuthSignedIn}
          onError={setError}
        />
        {APPLE_SIGN_IN_ENABLED ? (
          <AppleSignInButton
            disabled={busyAction !== null}
            onSuccess={handleOAuthSignedIn}
            onError={setError}
          />
        ) : null}
      </div>
      <LegalInlineLinks />

      <div className="space-y-2">
        <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
          Email magic link
          <input
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailLinkSent(false);
              setError(null);
            }}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={busyAction !== null}
            className="field-input"
          />
        </label>
        <button
          type="button"
          disabled={busyAction !== null || email.trim().length === 0}
          onClick={() => void handleEmailLink()}
          className="home-card-btn home-card-btn-secondary w-full disabled:opacity-50"
        >
          <span>Email me a sign-in link</span>
          <span className="home-card-btn-hint">
            {busyAction === "email" ? "Sending…" : "No password"}
          </span>
        </button>
        {emailLinkSent ? (
          <p className="text-sm text-ink-secondary">
            Check your inbox for a sign-in link. Open it on this device to
            continue{continuePath === "/premium" ? " on Premium" : ""}.
          </p>
        ) : null}
      </div>

      {recoveryNote ? (
        <p className="text-sm text-ink-secondary">{recoveryNote}</p>
      ) : null}
      {error ? <InlineError>{error}</InlineError> : null}
    </div>
  );
}
