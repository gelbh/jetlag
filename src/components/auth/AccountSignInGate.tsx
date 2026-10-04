import { Stack, Text, TextInput } from "@mantine/core";
import { isSignInWithEmailLink } from "firebase/auth";
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { EntryAsyncButton } from "@/components/ui/entry/EntryAsyncButton";
import { useHydrated } from "@/hooks/app/useHydrated";
import { usePermanentAuthUser } from "../../hooks/billing/usePermanentAuthUser";
import {
  completeOAuthRedirectIfPending,
  completePremiumEmailSignInLink,
  consumeOAuthRedirectFailureMessage,
  isPermanentUser,
  sendPremiumEmailSignInLink,
  signOutToAnonymous,
} from "../../services/core/auth/accountAuth";
import { hasPersistedPermanentUserHint } from "../../services/core/auth/persistedAuthHint";
import {
  ensureAnonymousUser,
  getFirebaseAuth,
  isFirebaseConfigured,
} from "../../services/core/firebase/firebase";
import { GoogleSignInButton } from "../billing/GoogleSignInButton";
import { LegalInlineLinks } from "../legal/LegalInlineLinks";
import { ErrorCallout, InsetGroup, SectionLabel } from "../ui/entry/entryChrome";
import { filledStyles, grayStyles } from "../ui/entry/entryStyles";

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
  // Until auth restores, show the signed-out prompt with its controls disabled, so prerendered
  // /premium paints its sign-in copy from HTML instead of waiting on Firebase (the snapshot and
  // the hydration render can't know the visitor's state). Once hydrated, a stored account
  // sign-in shows the checking line instead of a sign-in prompt that would vanish.
  const hydrated = useHydrated();
  const checking = !hydrated || !authReady;
  const expectPermanent = useMemo(() => hydrated && hasPersistedPermanentUserHint(), [hydrated]);
  const hasAuthUser = Boolean(user);
  const [email, setEmail] = useState("");
  const [busyAction, setBusyAction] = useState<"email" | null>(null);
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completingEmailLink, setCompletingEmailLink] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const oauthControlsDisabled =
    checking || completingEmailLink || busyAction !== null || !hasAuthUser;

  const handleSignedIn = useCallback(async () => {
    setError(null);
    onSignedIn?.();
  }, [onSignedIn]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const finishingEmailLink =
          isFirebaseConfigured() && isSignInWithEmailLink(getFirebaseAuth(), window.location.href);
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
            nextError instanceof Error ? nextError.message : "Could not complete email sign-in.",
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
      setError(nextError instanceof Error ? nextError.message : "Could not sign out.");
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
      setError(nextError instanceof Error ? nextError.message : "Could not send sign-in link.");
    } finally {
      setBusyAction(null);
    }
  };

  if (checking && expectPermanent) {
    return (
      <Text size="sm" c="var(--color-field-ink-muted)">
        Checking sign-in…
      </Text>
    );
  }

  if (completingEmailLink && !user) {
    return (
      <Text size="sm" c="var(--color-field-ink-muted)">
        Checking sign-in link…
      </Text>
    );
  }

  if (!checking && isPermanent) {
    const accountLabel = user?.email ?? user?.displayName ?? "your account";

    return (
      <Stack gap="md">
        <InsetGroup>
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
        </InsetGroup>
        <EntryAsyncButton
          type="button"
          fullWidth
          busy={signingOut}
          idleLabel="Sign out"
          busyLabel="Signing out…"
          onClick={() => void handleSignOut()}
          styles={grayStyles}
        />
        {error ? <ErrorCallout>{error}</ErrorCallout> : null}
        {children ?? null}
      </Stack>
    );
  }

  return (
    <Stack gap={22}>
      <Stack gap={8}>
        <SectionLabel>Sign in</SectionLabel>
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
          ? cloneElement(extraSignInProviders as ReactElement<{ disabled?: boolean }>, {
              disabled: oauthControlsDisabled,
            })
          : extraSignInProviders}
        <LegalInlineLinks />
      </Stack>

      <Stack gap={8}>
        <SectionLabel>Email magic link</SectionLabel>
        <InsetGroup>
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
            disabled={checking || busyAction !== null}
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
        </InsetGroup>
        <EntryAsyncButton
          type="button"
          fullWidth
          busy={busyAction === "email"}
          unavailable={
            checking || (busyAction !== null && busyAction !== "email") || email.trim().length === 0
          }
          idleLabel="Email me a sign-in link"
          busyLabel="Sending…"
          onClick={() => void handleEmailLink()}
          styles={filledStyles}
        />
        {emailLinkSent ? (
          <Text size="sm" c="var(--color-signal)" px={4}>
            Check your inbox for a sign-in link. Open it on this device to continue.
          </Text>
        ) : (
          <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
            No password required
          </Text>
        )}
      </Stack>

      {error ? <ErrorCallout>{error}</ErrorCallout> : null}
    </Stack>
  );
}
