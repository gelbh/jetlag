import { useState, type ReactNode } from "react";
import { isOAuthRedirectInProgress } from "../../services/core/accountAuth";
import { ensureAnonymousUser } from "../../services/core/firebase";

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

  const handleClick = async () => {
    setBusy(true);
    try {
      await ensureAnonymousUser();
      await onSignIn();
      await onSuccess();
      setBusy(false);
    } catch (error) {
      if (isOAuthRedirectInProgress(error)) {
        return;
      }
      onError(
        error instanceof Error
          ? error.message
          : `${provider === "apple" ? "Apple" : "Google"} sign-in failed.`,
      );
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={() => void handleClick()}
      className={`oauth-provider-button oauth-provider-button-${provider} disabled:opacity-50`}
    >
      <span className="oauth-provider-button-icon" aria-hidden="true">
        {icon}
      </span>
      <span>{busy ? busyLabel : label}</span>
    </button>
  );
}
