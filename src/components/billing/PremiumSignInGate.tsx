import { Stack } from "@mantine/core";
import { type ReactNode, useCallback, useState } from "react";
import { recoverPremiumEntitlements } from "../../services/billing/premiumBilling";
import { APPLE_SIGN_IN_ENABLED } from "../../services/core/auth/accountAuth";
import { AccountSignInGate } from "../auth/AccountSignInGate";
import { ErrorCallout, SuccessCallout } from "../ui/entry/entryChrome";
import { AppleSignInButton } from "./AppleSignInButton";

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
    <Stack gap="sm">
      <AccountSignInGate
        continuePath={continuePath}
        onSignedIn={handleSignedIn}
        description={`Sign in with Google${APPLE_SIGN_IN_ENABLED ? ", Apple" : ""}, or email so premium purchases and session credits follow your account across devices.`}
        extraSignInProviders={
          APPLE_SIGN_IN_ENABLED ? (
            <AppleSignInButton onSuccess={handleSignedIn} onError={setError} />
          ) : null
        }
      >
        {children ?? null}
      </AccountSignInGate>
      {recoveryNote ? <SuccessCallout>{recoveryNote}</SuccessCallout> : null}
      {error ? <ErrorCallout>{error}</ErrorCallout> : null}
    </Stack>
  );
}
