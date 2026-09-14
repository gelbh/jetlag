import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Button, Stack, Text, TextInput } from "@mantine/core";
import { isSignInWithEmailLink } from "firebase/auth";
import { LegalInlineLinks } from "../legal/LegalInlineLinks";
import { InlineError } from "../ui/banners/InlineError";
import {
  IosErrorCallout,
  IosInsetGroup,
  IosSectionLabel,
} from "../ui/apple/iosEntryChrome";
import { iosFilledStyles, iosGrayStyles } from "../ui/apple/iosEntryStyles";
import { GoogleSignInButton } from "../billing/GoogleSignInButton";
import {
  completeOAuthRedirectIfPending,
  completePremiumEmailSignInLink,
  consumeOAuthRedirectFailureMessage,
  isPermanentUser,
  sendPremiumEmailSignInLink,
  signOutToAnonymous,
} from "../../services/core/auth/accountAuth";
import {
  ensureAnonymousUser,
  getFirebaseAuth,
  isFirebaseConfigured,
} from "../../services/core/firebase/firebase";
import { usePermanentAuthUser } from "../../hooks/billing/usePermanentAuthUser";

interface AccountSignInGateProps {
  children?: ReactNode;
  continuePath?: string;
  onSignedIn?: () => void;
  description?: string;
  signedInHint?: string;
  extraSignInProviders?: ReactNode;
  chrome?: "survey" | "ios";
}

export function AccountSignInGate({
  children,
  continuePath = "/",
  onSignedIn,
  description = "Sign in with Google or email to save stats and appear on leaderboards.",
  signedInHint,
  extraSignInProviders,
  chrome = "survey",
}: AccountSignInGateProps) {
  const { user, isPermanent, authReady } = usePermanentAuthUser();
  const hasAuthUser = Boolean(user);
  const [email, setEmail] = useState("");
  const [busyAction, setBusyAction] = useState<"email" | null>(null);
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completingEmailLink, setCompletingEmailLink] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const oauthControlsDisabled =
    completingEmailLink || busyAction !== null || !hasAuthUser;

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
        if (!cancelled) {
          const redirectFailure = consumeOAuthRedirectFailureMessage();
          if (redirectFailure) {
            setError(redirectFailure);
          }
        }
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
        try {
          await ensureAnonymousUser();
        } catch {
          // Keep the original sign-in error visible.
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
    return (
      <Text size="sm" c={chrome === "ios" ? "var(--color-field-ink-muted)" : undefined} className={chrome === "ios" ? undefined : "text-sm text-ink-muted"}>
        Checking sign-in…
      </Text>
    );
  }

  if (completingEmailLink && !user) {
    return (
      <Text size="sm" c={chrome === "ios" ? "var(--color-field-ink-muted)" : undefined} className={chrome === "ios" ? undefined : "text-sm text-ink-muted"}>
        Checking sign-in link…
      </Text>
    );
  }

  if (isPermanent) {
    const accountLabel =
      user?.email ?? user?.displayName ?? "your account";

    if (chrome === "ios") {
      return (
        <Stack gap="md">
          <IosInsetGroup>
            <Stack gap={6} px="md" py="md">
              <Text size="sm" c="var(--color-field-ink-muted)">
                Signed in as {accountLabel}
              </Text>
              {signedInHint ? (
                <Text size="sm" c="var(--color-field-ink)">
                  {signedInHint}
                </Text>
              ) : null}
            </Stack>
          </IosInsetGroup>
          <Button
            type="button"
            disabled={signingOut}
            loading={signingOut}
            onClick={() => void handleSignOut()}
            styles={iosGrayStyles}
            fullWidth
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
          {error ? <IosErrorCallout>{error}</IosErrorCallout> : null}
          {children ?? null}
        </Stack>
      );
    }

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

  if (chrome === "ios") {
    return (
      <Stack gap={22}>
        <Stack gap={8}>
          <IosSectionLabel>Sign in</IosSectionLabel>
          <Text
            size="sm"
            c="var(--color-field-ink-muted)"
            style={{ lineHeight: 1.4, textWrap: "pretty" }}
            px={4}
          >
            {description}
          </Text>
        </Stack>

        <Stack gap="sm">
          <GoogleSignInButton
            disabled={oauthControlsDisabled}
            onSuccess={handleOAuthSignedIn}
            onError={setError}
          />
          {isValidElement(extraSignInProviders)
            ? cloneElement(
                extraSignInProviders as ReactElement<{ disabled?: boolean }>,
                { disabled: oauthControlsDisabled },
              )
            : extraSignInProviders}
          <LegalInlineLinks />
        </Stack>

        <Stack gap={8}>
          <IosSectionLabel>Email magic link</IosSectionLabel>
          <IosInsetGroup>
            <TextInput
              aria-label="Email"
              value={email}
              onChange={(event) => {
                setEmail(event.currentTarget.value);
                setEmailLinkSent(false);
                setError(null);
              }}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              disabled={busyAction !== null}
              styles={{
                input: {
                  border: "none",
                  background: "transparent",
                  minHeight: "3.25rem",
                  color: "var(--color-field-ink)",
                  fontSize: "1.0625rem",
                  paddingInline: "1rem",
                },
              }}
            />
          </IosInsetGroup>
          <Button
            type="button"
            fullWidth
            disabled={busyAction !== null || email.trim().length === 0}
            loading={busyAction === "email"}
            onClick={() => void handleEmailLink()}
            styles={iosFilledStyles}
          >
            {busyAction === "email" ? "Sending…" : "Email me a sign-in link"}
          </Button>
          {emailLinkSent ? (
            <Text size="sm" c="var(--color-signal)" px={4}>
              Check your inbox for a sign-in link. Open it on this device to
              continue.
            </Text>
          ) : (
            <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
              No password required
            </Text>
          )}
        </Stack>

        {error ? <IosErrorCallout>{error}</IosErrorCallout> : null}
      </Stack>
    );
  }

  return (
    <div className="desktop-entry-actions space-y-3">
      <p className="text-sm leading-relaxed text-ink-muted">{description}</p>

      <div className="oauth-sign-in-stack space-y-2">
        <GoogleSignInButton
          disabled={oauthControlsDisabled}
          onSuccess={handleOAuthSignedIn}
          onError={setError}
        />
        {isValidElement(extraSignInProviders)
          ? cloneElement(
              extraSignInProviders as ReactElement<{ disabled?: boolean }>,
              { disabled: oauthControlsDisabled },
            )
          : extraSignInProviders}
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
