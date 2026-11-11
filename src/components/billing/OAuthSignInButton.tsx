import { type ReactNode, useState } from "react";
import {
  oauthProviderButtonIconStyle,
  oauthProviderButtonStyle,
} from "@/components/ui/entry/entryStyles";
import { isOAuthRedirectInProgress } from "../../services/core/auth/accountAuth";
import { getFirebaseAuth } from "../../services/core/firebase/firebase";

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

  const failureMessage = `${provider === "apple" ? "Apple" : "Google"} sign-in failed.`;

  const handleClick = async () => {
    // Never await before opening the popup, since Chrome spends the user gesture
    // on any prior await and returns auth/popup-blocked → redirect fallback.
    let notReadyMessage: string | null = null;
    try {
      if (!getFirebaseAuth().currentUser) {
        notReadyMessage = "Sign-in isn’t ready yet. Wait a moment and try again.";
      }
    } catch (error) {
      notReadyMessage = error instanceof Error ? error.message : failureMessage;
    }
    if (notReadyMessage !== null) {
      onError(notReadyMessage);
      return;
    }
    setBusy(true);
    try {
      await onSignIn();
      await onSuccess();
      setBusy(false);
    } catch (error) {
      if (isOAuthRedirectInProgress(error)) {
        return;
      }
      onError(error instanceof Error ? error.message : failureMessage);
      setBusy(false);
    }
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
