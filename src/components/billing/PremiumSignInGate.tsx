import { useCallback, useState, type ReactNode } from "react";
import { AccountSignInGate } from "../auth/AccountSignInGate";
import { AppleSignInButton } from "./AppleSignInButton";
import { InlineError } from "../ui/InlineError";
import { APPLE_SIGN_IN_ENABLED } from "../../services/core/accountAuth";
import { recoverPremiumEntitlements } from "../../services/billing/premiumBilling";

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
  const [error, setError] = useState<string | null>(null);
  const [recoveryNote, setRecoveryNote] = useState<string | null>(null);

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

  return (
    <div className="space-y-3">
      <AccountSignInGate
        continuePath={continuePath}
        onSignedIn={handleSignedIn}
        description={`Sign in with Google${APPLE_SIGN_IN_ENABLED ? ", Apple" : ""}, or email so premium purchases and session credits follow your account across devices.`}
        extraSignInProviders={
          APPLE_SIGN_IN_ENABLED ? (
            <AppleSignInButton
              onSuccess={handleSignedIn}
              onError={setError}
            />
          ) : null
        }
      >
        {children ?? null}
      </AccountSignInGate>
      {recoveryNote ? (
        <p className="text-sm text-ink-secondary">{recoveryNote}</p>
      ) : null}
      {error ? <InlineError>{error}</InlineError> : null}
    </div>
  );
}
