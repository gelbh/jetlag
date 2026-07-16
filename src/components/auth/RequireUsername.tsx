import type { ReactNode } from "react";
import { usePermanentAuthUser } from "../../hooks/billing/usePermanentAuthUser";
import { useUserProfile } from "../../hooks/profile/useUserProfile";
import { isFirebaseConfigured } from "../../services/core/firebase";
import { BootSplash } from "../ui/BootSplash";
import { InlineError } from "../ui/InlineError";
import { AccountSignInGate } from "./AccountSignInGate";
import { UsernameSetupGate } from "./UsernameSetupGate";

interface RequireUsernameProps {
  continuePath: string;
  children: ReactNode;
  signInDescription?: string;
}

export function RequireUsername({
  continuePath,
  children,
  signInDescription,
}: RequireUsernameProps) {
  const { user, isPermanent, authReady } = usePermanentAuthUser();
  const profileEnabled =
    isFirebaseConfigured() && isPermanent && user != null;
  const { profile, ready, error } = useUserProfile(user?.uid, profileEnabled);

  if (isFirebaseConfigured() && !authReady) {
    return <BootSplash label="Starting…" />;
  }

  if (isFirebaseConfigured() && authReady && !isPermanent) {
    return (
      <AccountSignInGate
        continuePath={continuePath}
        description={
          signInDescription ??
          "Sign in and choose a username to continue."
        }
      />
    );
  }

  if (profileEnabled && !ready) {
    return <BootSplash label="Loading profile…" />;
  }

  if (profileEnabled && error) {
    return (
      <InlineError>
        Could not load your profile. Check your connection and try again.
      </InlineError>
    );
  }

  if (profileEnabled && profile == null) {
    return (
      <UsernameSetupGate
        description="Pick a unique username before using friends, stats, and leaderboards."
      />
    );
  }

  return <>{children}</>;
}
