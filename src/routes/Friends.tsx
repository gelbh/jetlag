import { AccountSignInGate } from "../components/auth/AccountSignInGate";
import { BootSplash } from "../components/ui/BootSplash";
import { EntryScreenLayout } from "../components/ui/EntryScreenLayout";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../components/ui/ScreenHeader";
import { usePermanentAuthUser } from "../hooks/billing/usePermanentAuthUser";
import { isFirebaseConfigured } from "../services/core/firebase";

export function Friends() {
  const { isPermanent, authReady } = usePermanentAuthUser();
  const showSignIn =
    isFirebaseConfigured() && authReady && !isPermanent;

  if (isFirebaseConfigured() && !authReady) {
    return <BootSplash label="Starting…" />;
  }

  return (
    <EntryScreenLayout justify="start">
      <ScreenHeader backTo="/" backLabel="Home" />
      <div className={`space-y-4 ${screenHeaderOffsetClassName}`}>
        <div className="space-y-1">
          <h1 className="font-display text-balance text-[clamp(2rem,10vw,3rem)] font-bold uppercase leading-[0.92] tracking-tight text-ink">
            Friends
          </h1>
          <p className="max-w-sm text-pretty text-base leading-relaxed text-ink-muted">
            Search by display name, send requests, and invite friends to your
            session.
          </p>
        </div>

        {showSignIn ? (
          <AccountSignInGate
            continuePath="/friends"
            description="Sign in to add friends and see their stats on friends leaderboards."
          />
        ) : (
          <div className="space-y-3 border-t-2 border-border pt-4">
            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
              Your friends
            </p>
            <p className="text-sm leading-relaxed text-ink-muted">
              No friends yet. Search for a display name to send a request once
              friend profiles are live.
            </p>
          </div>
        )}
      </div>
    </EntryScreenLayout>
  );
}
