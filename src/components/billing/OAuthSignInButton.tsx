import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  oauthProviderButtonIconStyle,
  oauthProviderButtonStyle,
} from "@/components/ui/entry/entryStyles";
import { isIosStandalonePwa } from "../../domain/device/pwa/isIosStandalonePwa";
import {
  isOAuthRedirectInProgress,
  OAUTH_RESUME_TIMEOUT_MESSAGE,
} from "../../services/core/auth/accountAuth";
import { getFirebaseAuth } from "../../services/core/firebase/firebase";

// ponytail: fixed grace, 15s after the player returns, or 60s if the app never went hidden
// (the provider sheet may not hide it). Slower exchanges are reported as "try again" though
// they may still sign the player in (firebase-js-sdk#10407).
// Drop once Firebase settles popups in iOS home-screen apps, or move them to redirect.
export const OAUTH_RESUME_GRACE_MS = 15_000;
export const OAUTH_NEVER_HIDDEN_GRACE_MS = 60_000;

// iOS home-screen apps open the provider page without a window handle, so Firebase
// never reports the popup as closed and the sign-in promise can hang forever.
function armResumeRecovery(onTimeout: () => void): () => void {
  let timer: number | null = null;
  const clear = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };
  const start = (ms: number) => {
    clear();
    timer = window.setTimeout(() => {
      timer = null;
      onTimeout();
    }, ms);
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      clear();
      return;
    }
    start(OAUTH_RESUME_GRACE_MS);
  };

  if (document.visibilityState === "visible") {
    start(OAUTH_NEVER_HIDDEN_GRACE_MS);
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    clear();
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

interface OAuthSignInButtonProps {
  provider: "apple" | "google";
  disabled?: boolean;
  onSignIn: () => Promise<unknown>;
  onSuccess: () => void | Promise<void>;
  onError: (message: string) => void;
  icon: ReactNode;
  label: string;
  busyLabel?: string;
}

export function OAuthSignInButton({
  provider,
  disabled = false,
  onSignIn,
  onSuccess,
  onError,
  icon,
  label,
  busyLabel = "Opening…",
}: OAuthSignInButtonProps) {
  const [busy, setBusy] = useState(false);
  const succeededRef = useRef(false);
  const stopRecoveryRef = useRef<() => void>(() => {});

  useEffect(() => () => stopRecoveryRef.current(), []);

  const failureMessage = `${provider === "apple" ? "Apple" : "Google"} sign-in failed.`;
  const messageOf = (error: unknown) => (error instanceof Error ? error.message : failureMessage);

  const handleClick = async () => {
    // Never await before opening the popup, since Chrome spends the user gesture
    // on any prior await and returns auth/popup-blocked → redirect fallback.
    let notReadyMessage: string | null = null;
    try {
      if (!getFirebaseAuth().currentUser) {
        notReadyMessage = "Sign-in isn’t ready yet. Wait a moment and try again.";
      }
    } catch (error) {
      notReadyMessage = messageOf(error);
    }
    if (notReadyMessage !== null) {
      onError(notReadyMessage);
      return;
    }
    setBusy(true);

    succeededRef.current = false;
    let failed = false;
    let stopRecovery = () => {};

    // First success across attempts wins: a timed-out attempt that resolves during a retry
    // signs the player in, and the retry's own outcome is then ignored.
    const succeed = async () => {
      if (succeededRef.current) {
        return;
      }
      succeededRef.current = true;
      stopRecovery();
      stopRecoveryRef.current();
      try {
        await onSuccess();
      } catch (error) {
        onError(messageOf(error));
      }
      setBusy(false);
    };

    const fail = (message: string) => {
      if (failed || succeededRef.current) {
        return;
      }
      failed = true;
      stopRecovery();
      onError(message);
      setBusy(false);
    };

    if (isIosStandalonePwa()) {
      stopRecovery = armResumeRecovery(() => fail(OAUTH_RESUME_TIMEOUT_MESSAGE));
      stopRecoveryRef.current = stopRecovery;
    }

    try {
      await onSignIn();
    } catch (error) {
      if (isOAuthRedirectInProgress(error)) {
        stopRecovery();
        return;
      }
      fail(messageOf(error));
      return;
    }
    await succeed();
  };

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={() => void handleClick()}
      data-feedback="tap"
      data-oauth-provider={provider}
      style={oauthProviderButtonStyle}
      className="disabled:opacity-50"
    >
      <span style={oauthProviderButtonIconStyle} aria-hidden="true">
        {icon}
      </span>
      <span>{busy ? busyLabel : label}</span>
    </button>
  );
}
