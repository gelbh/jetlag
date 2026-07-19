import { useCallback, useEffect, useState, type ReactNode } from "react";
import { isSignInWithEmailLink } from "firebase/auth";
import { LegalInlineLinks } from "../legal/LegalInlineLinks";
import { InlineError } from "../ui/InlineError";
import { GoogleSignInButton } from "../billing/GoogleSignInButton";
import {
  completeOAuthRedirectIfPending,
  completePremiumEmailSignInLink,
  isPermanentUser,
  sendPremiumEmailSignInLink,
  signOutToAnonymous,
} from "../../services/core/accountAuth";
import {
  ensureAnonymousUser,
  getFirebaseAuth,
  isFirebaseConfigured,
} from "../../services/core/firebase";
import { usePermanentAuthUser } from "../../hooks/billing/usePermanentAuthUser";

interface AccountSignInGateProps {
  children?: ReactNode;
  continuePath?: string;
  onSignedIn?: () => void;
  description?: string;
  signedInHint?: string;
  extraSignInProviders?: ReactNode;
}

export function AccountSignInGate({
  children,
  continuePath = "/",
  onSignedIn,
  description = "Sign in with Google or email to save stats and appear on leaderboards.",
  signedInHint,
  extraSignInProviders,
}: AccountSignInGateProps) {
  const { user, isPermanent, authReady } = usePermanentAuthUser();
  const [email, setEmail] = useState("");
  const [busyAction, setBusyAction] = useState<"email" | null>(null);
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completingEmailLink, setCompletingEmailLink] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignedIn = useCallback(async () => {
    setError(null);
    onSignedIn?.();
  }, [onSignedIn]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const finishingEmailLink =
          isFirebaseConfigured() &&
          isSignInWithEmailLink(getFirebaseAuth(), window.location.href);
        if (finishingEmailLink && !cancelled) {
          setCompletingEmailLink(true);
        }

        const oauthCompleted = await completeOAuthRedirectIfPending();
        if (!cancelled && oauthCompleted && isPermanentUser(oauthCompleted)) {
          await handleSignedIn();
          return;
        }

        await ensureAnonymousUser();
        const completed = await completePremiumEmailSignInLink();
        if (!cancelled && completed && isPermanentUser(completed)) {
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

  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);

    try {
      await signOutToAnonymous();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not sign out.",
      );
    } finally {
      setSigningOut(false);
    }
  };

  const handleEmailLink = async () => {
    setBusyAction("email");
    setError(null);

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
    return <p className="text-sm text-ink-muted">Checking sign-in…</p>;
  }

  if (completingEmailLink && !user) {
    return <p className="text-sm text-ink-muted">Checking sign-in link…</p>;
  }

  if (isPermanent) {
    const accountLabel =
      user?.email ?? user?.displayName ?? "your account";

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-muted">
            Signed in as {accountLabel}
          </p>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            className="home-feedback-link min-h-11 px-2 disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
        {signedInHint ? (
          <p className="text-sm text-ink-secondary">{signedInHint}</p>
        ) : null}
        {error ? <InlineError>{error}</InlineError> : null}
        {children ?? null}
      </div>
    );
  }

  return (
    <div className="desktop-entry-actions space-y-3">
      <p className="text-sm leading-relaxed text-ink-muted">{description}</p>

      <div className="oauth-sign-in-stack space-y-2">
        <GoogleSignInButton
          disabled={busyAction !== null}
          onSuccess={handleOAuthSignedIn}
          onError={setError}
        />
        {extraSignInProviders}
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
            continue.
          </p>
        ) : null}
      </div>

      {error ? <InlineError>{error}</InlineError> : null}
    </div>
  );
}
