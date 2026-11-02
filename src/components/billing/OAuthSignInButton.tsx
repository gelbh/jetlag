import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  oauthProviderButtonIconStyle,
  oauthProviderButtonStyle,
} from "@/components/ui/entry/entryStyles";
import { isIosStandalonePwa } from "../../domain/device/pwa/isIosStandalonePwa";
import {
  isOAuthRedirectInProgress,
  isPermanentUser,
  OAUTH_RESUME_TIMEOUT_MESSAGE,
} from "../../services/core/auth/accountAuth";
import { getFirebaseAuth } from "../../services/core/firebase/firebase";

// ponytail: fixed grace after the player returns. Exchanges slower than this are
// reported as "try again" though they may still sign the player in (firebase-js-sdk#10407).
// Drop once Firebase settles popups in iOS home-screen apps, or move them to redirect.
export const OAUTH_RESUME_GRACE_MS = 15_000;

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
  const start = () => {
    clear();
    timer = window.setTimeout(() => {
      timer = null;
      onTimeout();
    }, OAUTH_RESUME_GRACE_MS);
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      clear();
      return;
    }
    start();
  };

  if (document.visibilityState === "visible") {
    start();
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

    let finished = false;
    let succeeded = false;
    let stopRecovery = () => {};

    const succeed = async () => {
      if (succeeded) {
        return;
      }
      succeeded = true;
      finished = true;
      stopRecovery();
      try {
        await onSuccess();
      } catch (error) {
        onError(messageOf(error));
      }
      setBusy(false);
    };

    const fail = (message: string) => {
      if (finished) {
        return;
      }
      finished = true;
      stopRecovery();
      onError(message);
      setBusy(false);
    };

    if (isIosStandalonePwa()) {
      stopRecovery = armResumeRecovery(() => {
        if (isPermanentUser(getFirebaseAuth().currentUser)) {
          void succeed();
          return;
        }
        fail(OAUTH_RESUME_TIMEOUT_MESSAGE);
      });
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
